import { and, eq, sql } from "drizzle-orm";
import { createError } from "h3";
import { z } from "zod";
import { problemDifficulties, problemStatuses } from "@shared/types";
import { db } from "../../db";
import { problems } from "../../db/schema";
import { requireSession } from "../../utils/auth-session";
import { nowIso } from "../../utils/time";

const emptyStringToNull = (value: unknown) => typeof value === "string" && value.trim() === "" ? null : value;
const updateInput = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  titleCn: z.preprocess(emptyStringToNull, z.string().trim().max(300).nullable().optional()),
  difficulty: z.enum(problemDifficulties).optional(),
  status: z.enum(problemStatuses).optional(),
  nextReviewAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  expectedVersion: z.number().int().positive(),
}).refine((value) => Object.keys(value).some((key) => key !== "expectedVersion"), { message: "Empty update" });

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Missing problem id" });

  const parsed = updateInput.safeParse(await readBody(event));
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: "Invalid problem update" });
  const { expectedVersion, ...updates } = parsed.data;

  const conditions = [
    eq(problems.userId, session.user.id),
    eq(problems.id, id),
    eq(problems.version, expectedVersion),
  ];

  const [updated] = await db
    .update(problems)
    .set({
      ...updates,
      version: sql`${problems.version} + 1`,
      updatedAt: nowIso(),
    })
    .where(and(...conditions))
    .returning();

  if (!updated) {
    const [existing] = await db
      .select({ id: problems.id, version: problems.version })
      .from(problems)
      .where(and(eq(problems.userId, session.user.id), eq(problems.id, id)))
      .limit(1);
    if (!existing) throw createError({ statusCode: 404, statusMessage: "Problem not found" });
    throw createError({
      statusCode: 409,
      statusMessage: "Problem changed by another request",
      data: { code: "VERSION_CONFLICT", currentVersion: existing.version },
    });
  }
  return updated;
});
