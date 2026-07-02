import { and, eq } from "drizzle-orm";
import { createError } from "h3";
import { db } from "../../db";
import { problems } from "../../db/schema";
import { requireSession } from "../../utils/auth-session";

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Missing problem id" });

  const [deleted] = await db
    .delete(problems)
    .where(and(eq(problems.userId, session.user.id), eq(problems.id, id)))
    .returning();

  if (!deleted) throw createError({ statusCode: 404, statusMessage: "Problem not found" });
  return { ok: true };
});
