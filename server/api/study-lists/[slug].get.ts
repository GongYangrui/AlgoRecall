import { createError } from "h3";
import { getStudyListDetail } from "../../utils/study-lists";
import { requireSession } from "../../utils/auth-session";
import { trackAnalyticsEvent } from "../../utils/analytics";
import { createPerformanceTimer, logRequestPerformance, setServerTimingHeader } from "../../utils/performance";

export default defineEventHandler(async (event) => {
  const timer = createPerformanceTimer();
  let session: Awaited<ReturnType<typeof requireSession>> | null = null;
  let route = event.path || event.node.req.url || "/api/study-lists";
  let shouldLogPerformance = false;

  try {
    session = await timer.measure("auth", "auth", () => requireSession(event));
    const slug = getRouterParam(event, "slug");
    if (!slug) throw createError({ statusCode: 400, statusMessage: "Missing study list slug" });
    route = `/api/study-lists/${slug}`;

    const detail = await getStudyListDetail(session.user.id, slug, timer);
    if (!detail) throw createError({ statusCode: 404, statusMessage: "Study list not found" });
    await timer.measure("analyticsInsert", "db", () => trackAnalyticsEvent({
      userId: session!.user.id,
      event: "study_list_viewed",
      entityType: "study_list",
      entityId: slug,
      route,
    }));

    shouldLogPerformance = true;
    return detail;
  } finally {
    setServerTimingHeader(event, timer);
    if (shouldLogPerformance && session) {
      logRequestPerformance(event, {
        timer,
        operation: "study_list.detail",
        route,
        userId: session.user.id,
        statusCode: 200,
      });
    }
  }
});
