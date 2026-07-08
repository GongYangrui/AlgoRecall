import { and, eq } from "drizzle-orm";
import { createError } from "h3";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { getToday } from "@shared/schedule";
import { problemDifficulties } from "@shared/types";
import { db } from "../../db";
import { problems } from "../../db/schema";
import { requireSession } from "../../utils/auth-session";
import { isPostgresUniqueViolation } from "../../utils/db-errors";
import { setLogOperation } from "../../utils/log-context";
import { assertRateLimit } from "../../utils/rate-limit";
import { nowIso } from "../../utils/time";

const MAX_BULK_IMPORT = 50;
const emptyStringToNull = (value: unknown) => typeof value === "string" && value.trim() === "" ? null : value;
const optionalText = (max: number) => z.preprocess(emptyStringToNull, z.string().trim().min(1).max(max).optional().nullable());
const optionalUrl = z.preprocess(emptyStringToNull, z.string().trim().url().optional().nullable());
const problemInput = z.object({
  title: z.string().trim().min(1).max(300),
  titleCn: optionalText(300),
  titleSlug: optionalText(200),
  frontendId: optionalText(40),
  url: optionalUrl,
  urlEn: optionalUrl,
  urlCn: optionalUrl,
  difficulty: z.enum(problemDifficulties).default("medium"),
  tags: z.union([z.string().max(2000), z.array(z.string().trim().min(1).max(80)).max(80)]).optional().nullable(),
  tagsCn: z.union([z.string().max(2000), z.array(z.string().trim().min(1).max(80)).max(80)]).optional().nullable(),
});

function normalizeTags(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean).join(", ");
  return value?.trim() || null;
}

function primaryUrl(item: z.infer<typeof problemInput>) {
  return item.url || item.urlEn || item.urlCn;
}

function createProblemValues(userId: string, item: z.infer<typeof problemInput>, now: string) {
  const url = primaryUrl(item);
  if (!url) return null;

  return {
    id: uuidv4(),
    userId,
    title: item.title,
    titleCn: item.titleCn || null,
    titleSlug: item.titleSlug || null,
    frontendId: item.frontendId || null,
    url,
    urlEn: item.urlEn || null,
    urlCn: item.urlCn || null,
    platform: "leetcode",
    difficulty: item.difficulty,
    tags: normalizeTags(item.tags),
    tagsCn: normalizeTags(item.tagsCn),
    status: "new",
    stage: 0,
    lastResult: null,
    wrongCount: 0,
    nextReviewAt: getToday(),
    lastReviewedAt: null,
    reviewCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

async function findExistingProblem(userId: string, item: Pick<z.infer<typeof problemInput>, "titleSlug" | "frontendId">) {
  if (item.titleSlug) {
    const [existing] = await db
      .select()
      .from(problems)
      .where(and(eq(problems.userId, userId), eq(problems.titleSlug, item.titleSlug)))
      .limit(1);
    if (existing) return existing;
  }

  if (item.frontendId) {
    const [existing] = await db
      .select()
      .from(problems)
      .where(and(eq(problems.userId, userId), eq(problems.frontendId, item.frontendId)))
      .limit(1);
    if (existing) return existing;
  }

  return null;
}

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const body = await readBody(event);
  assertRateLimit(event, {
    bucket: Array.isArray(body?.problems) ? "problem.bulk_create" : "problem.create",
    key: session.user.id,
    limit: Array.isArray(body?.problems) ? 10 : 120,
    windowMs: 60_000,
  });
  setLogOperation(event, "problem.create", {
    bulk: Array.isArray(body?.problems),
    count: Array.isArray(body?.problems) ? body.problems.length : 1,
    titleSlug: Array.isArray(body?.problems) ? undefined : body?.titleSlug,
    frontendId: Array.isArray(body?.problems) ? undefined : body?.frontendId,
  });
  const now = nowIso();

  if (Array.isArray(body?.problems)) {
    if (body.problems.length > MAX_BULK_IMPORT) {
      throw createError({ statusCode: 400, statusMessage: `Bulk import is limited to ${MAX_BULK_IMPORT} problems` });
    }

    const created = [];
    const duplicates = [];
    const errors: Array<{ index: number; message: string }> = [];

    for (const [index, raw] of body.problems.entries()) {
      const parsed = problemInput.safeParse(raw);
      if (!parsed.success) {
        errors.push({ index, message: "Invalid problem payload" });
        continue;
      }
      const item = parsed.data;
      const problem = createProblemValues(session.user.id, item, now);
      if (!problem) {
        errors.push({ index, message: "Title and URL are required" });
        continue;
      }

      const existing = await findExistingProblem(session.user.id, item);
      if (existing) {
        duplicates.push(existing);
        continue;
      }

      try {
        const [inserted] = await db.insert(problems).values(problem).returning();
        created.push(inserted);
      } catch (error) {
        if (isPostgresUniqueViolation(error)) {
          const duplicate = await findExistingProblem(session.user.id, item);
          if (duplicate) {
            duplicates.push(duplicate);
            continue;
          }
        }
        errors.push({ index, message: "Failed to import problem" });
      }
    }

    setResponseStatus(event, 201);
    return { created, duplicates, errors };
  }

  const parsed = problemInput.safeParse(body);
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "Title and URL are required" });
  }

  const item = parsed.data;
  const problem = createProblemValues(session.user.id, item, now);
  if (!problem) {
    throw createError({ statusCode: 400, statusMessage: "Title and URL are required" });
  }

  const existing = await findExistingProblem(session.user.id, item);
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: "already_exists", data: { problem: existing } });
  }

  try {
    const [created] = await db.insert(problems).values(problem).returning();
    setResponseStatus(event, 201);
    return created;
  } catch (error) {
    if (isPostgresUniqueViolation(error)) {
      const duplicate = await findExistingProblem(session.user.id, item);
      throw createError({ statusCode: 409, statusMessage: "already_exists", data: { problem: duplicate } });
    }
    throw error;
  }
});
