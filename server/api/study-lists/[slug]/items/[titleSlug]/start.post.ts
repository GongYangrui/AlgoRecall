import { createError } from "h3";
import { startStudyListItem } from "../../../../../utils/study-lists";
import { requireSession } from "../../../../../utils/auth-session";

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const slug = getRouterParam(event, "slug");
  const titleSlug = getRouterParam(event, "titleSlug");
  if (!slug || !titleSlug) throw createError({ statusCode: 400, statusMessage: "Missing study list item" });

  const problem = await startStudyListItem(session.user.id, slug, titleSlug);
  if (!problem) throw createError({ statusCode: 404, statusMessage: "Study list item not found" });
  setResponseStatus(event, 201);
  return problem;
});
