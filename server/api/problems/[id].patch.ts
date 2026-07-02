import { format } from "date-fns";
import { and, eq } from "drizzle-orm";
import { createError } from "h3";
import { z } from "zod";
import { db } from "../../db";
import { problems } from "../../db/schema";
import { requireSession } from "../../utils/auth-session";

const updateInput = z.object({
  title: z.string().min(1).optional(),
  titleCn: z.string().nullable().optional(),
  difficulty: z.string().optional(),
  status: z.string().optional(),
  nextReviewAt: z.string().nullable().optional(),
});

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
      updatedAt: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
    })
    .where(and(eq(problems.userId, session.user.id), eq(problems.id, id)))
    .returning();

  if (!updated) throw createError({ statusCode: 404, statusMessage: "Problem not found" });
  return updated;
});
