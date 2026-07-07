import { getTodayStudyPlan } from "../../utils/study-lists";
import { requireSession } from "../../utils/auth-session";
import { trackAnalyticsEvent } from "../../utils/analytics";

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const plan = await getTodayStudyPlan(session.user.id);
  await trackAnalyticsEvent({
    userId: session.user.id,
    event: "app_opened",
    entityType: "page",
    entityId: "today",
    route: "/api/study-plan/today",
  });
  return plan;
});
