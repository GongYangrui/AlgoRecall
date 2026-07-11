import { createError } from "h3";
import { requireSession } from "./auth-session";

export async function requireAdminSession(event: Parameters<typeof requireSession>[0]) {
  const session = await requireSession(event);
  const user = session.user as typeof session.user & { role?: string };
  if (user.role !== "admin") {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }
  return session;
}
