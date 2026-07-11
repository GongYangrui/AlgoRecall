import { and, eq } from "drizzle-orm";
import { createError } from "h3";
import { db } from "../../db";
import { problems } from "../../db/schema";
import { requireSession } from "../../utils/auth-session";

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "Missing problem id" });
  const query = getQuery(event);
  const rawExpectedVersion = query.expectedVersion;
  const expectedVersion = typeof rawExpectedVersion === "string" ? Number(rawExpectedVersion) : Number.NaN;
  if (!Number.isInteger(expectedVersion) || expectedVersion <= 0) {
    throw createError({ statusCode: 400, statusMessage: "expectedVersion is required" });
  }

  const conditions = [
    eq(problems.userId, session.user.id),
    eq(problems.id, id),
    eq(problems.version, expectedVersion),
  ];

  const [deleted] = await db
    .delete(problems)
    .where(and(...conditions))
    .returning();

  if (!deleted) {
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
  return { ok: true };
});
