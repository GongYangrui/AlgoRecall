import { createError } from "h3";
import { queueNextStudyListItems } from "../../../utils/study-lists";
import { requireSession } from "../../../utils/auth-session";
import { trackAnalyticsEvent } from "../../../utils/analytics";
import { setLogOperation } from "../../../utils/log-context";

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const slug = getRouterParam(event, "slug");
  if (!slug) throw createError({ statusCode: 400, statusMessage: "Missing study list slug" });
  setLogOperation(event, "study_list.queue_next", { studyListSlug: slug });

  const result = await queueNextStudyListItems(session.user.id, slug);
  if (!result) throw createError({ statusCode: 404, statusMessage: "Study list not found" });
  void trackAnalyticsEvent({
    userId: session.user.id,
    event: "study_list_queued_next",
    entityType: "study_list",
    entityId: slug,
    route: `/api/study-lists/${slug}/queue-next`,
    metadata: { queued: result.queued, skipped: result.skipped, remaining: result.remaining },
  });
  setResponseStatus(event, 201);
  return result;
});
