import { and, eq } from "drizzle-orm";
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
}).refine((value) => Object.keys(value).length > 0, { message: "Empty update" });

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Missing problem id" });

  const parsed = updateInput.safeParse(await readBody(event));
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: "Invalid problem update" });

  const [updated] = await db
    .update(problems)
    .set({
      ...parsed.data,
      updatedAt: nowIso(),
    })
    .where(and(eq(problems.userId, session.user.id), eq(problems.id, id)))
    .returning();

  if (!updated) throw createError({ statusCode: 404, statusMessage: "Problem not found" });
  return updated;
});
