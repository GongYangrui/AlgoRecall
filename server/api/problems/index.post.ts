import { format } from "date-fns";
import { and, eq } from "drizzle-orm";
import { createError } from "h3";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { getToday } from "@shared/schedule";
import { db } from "../../db";
import { problems } from "../../db/schema";
import { requireSession } from "../../utils/auth-session";

const problemInput = z.object({
  title: z.string().min(1),
  titleCn: z.string().optional().nullable(),
  frontendId: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  urlEn: z.string().optional().nullable(),
  urlCn: z.string().optional().nullable(),
  difficulty: z.string().default("medium"),
  tags: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  tagsCn: z.union([z.string(), z.array(z.string())]).optional().nullable(),
});

function normalizeTags(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) return value.join(", ");
  return value || null;
}

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const body = await readBody(event);
  const now = format(new Date(), "yyyy-MM-dd HH:mm:ss");
  const nextReviewAt = getToday();

  if (Array.isArray(body?.problems)) {
    const created = [];
    const duplicates = [];

    for (const raw of body.problems) {
      const parsed = problemInput.safeParse(raw);
      if (!parsed.success) continue;
      const item = parsed.data;
      const primaryUrl = item.urlEn || item.url || item.urlCn;
      if (!primaryUrl) continue;

      if (item.frontendId) {
        const existing = await db
          .select()
          .from(problems)
          .where(and(eq(problems.userId, session.user.id), eq(problems.frontendId, item.frontendId)))
          .limit(1);
        if (existing.length > 0) {
          duplicates.push(existing[0]);
          continue;
        }
      }

      const problem = {
        id: uuidv4(),
        userId: session.user.id,
        title: item.title,
        titleCn: item.titleCn || null,
        frontendId: item.frontendId || null,
        url: primaryUrl,
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
        nextReviewAt,
        lastReviewedAt: null,
        reviewCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(problems).values(problem);
      created.push(problem);
    }

    setResponseStatus(event, 201);
    return { created, duplicates };
  }

  const parsed = problemInput.safeParse(body);
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "Title and URL are required" });
  }

  const item = parsed.data;
  const primaryUrl = item.url || item.urlEn || item.urlCn;
  if (!primaryUrl) {
    throw createError({ statusCode: 400, statusMessage: "Title and URL are required" });
  }

  if (item.frontendId) {
    const existing = await db
      .select()
      .from(problems)
      .where(and(eq(problems.userId, session.user.id), eq(problems.frontendId, item.frontendId)))
      .limit(1);
    if (existing.length > 0) {
      throw createError({ statusCode: 409, statusMessage: "already_exists", data: { problem: existing[0] } });
    }
  }

  const problem = {
    id: uuidv4(),
    userId: session.user.id,
    title: item.title,
    titleCn: item.titleCn || null,
    frontendId: item.frontendId || null,
    url: primaryUrl,
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
    nextReviewAt,
    lastReviewedAt: null,
    reviewCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(problems).values(problem);
  setResponseStatus(event, 201);
  return problem;
});
