import { createError } from "h3";
import { getStudyListDetail } from "../../utils/study-lists";
import { requireSession } from "../../utils/auth-session";

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const slug = getRouterParam(event, "slug");
  if (!slug) throw createError({ statusCode: 400, statusMessage: "Missing study list slug" });

  const detail = await getStudyListDetail(session.user.id, slug);
  if (!detail) throw createError({ statusCode: 404, statusMessage: "Study list not found" });
  return detail;
});
