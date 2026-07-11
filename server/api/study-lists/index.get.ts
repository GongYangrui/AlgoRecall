import { listStudyListSummaries } from "../../utils/study-lists";
import { requireSession } from "../../utils/auth-session";
import { trackAnalyticsEvent } from "../../utils/analytics";

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const summaries = await listStudyListSummaries(session.user.id);
  void trackAnalyticsEvent({
    userId: session.user.id,
    event: "study_lists_viewed",
    entityType: "page",
    entityId: "study-lists",
    route: "/api/study-lists",
  });
  return summaries;
});
