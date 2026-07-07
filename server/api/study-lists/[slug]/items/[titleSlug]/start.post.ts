import { createError } from "h3";
import { startStudyListItem } from "../../../../../utils/study-lists";
import { requireSession } from "../../../../../utils/auth-session";
import { trackAnalyticsEvent } from "../../../../../utils/analytics";
import { setLogOperation } from "../../../../../utils/log-context";

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const slug = getRouterParam(event, "slug");
  const titleSlug = getRouterParam(event, "titleSlug");
  if (!slug || !titleSlug) throw createError({ statusCode: 400, statusMessage: "Missing study list item" });
  setLogOperation(event, "study_item.start", { studyListSlug: slug, titleSlug });

  const problem = await startStudyListItem(session.user.id, slug, titleSlug);
  if (!problem) throw createError({ statusCode: 404, statusMessage: "Study list item not found" });
  await trackAnalyticsEvent({
    userId: session.user.id,
    event: "study_item_started",
    entityType: "problem",
    entityId: problem.id,
    route: `/api/study-lists/${slug}/items/${titleSlug}/start`,
    metadata: { studyListSlug: slug, titleSlug },
  });
  setResponseStatus(event, 201);
  return problem;
});
