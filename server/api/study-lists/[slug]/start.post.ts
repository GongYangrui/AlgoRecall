import { createError } from "h3";
import { z } from "zod";
import { startStudyList } from "../../../utils/study-lists";
import { requireSession } from "../../../utils/auth-session";
import { trackAnalyticsEvent } from "../../../utils/analytics";
import { setLogOperation } from "../../../utils/log-context";

const startInput = z.object({ dailyNewCount: z.number().int().min(0).max(20).optional() }).passthrough();

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const slug = getRouterParam(event, "slug");
  if (!slug) throw createError({ statusCode: 400, statusMessage: "Missing study list slug" });

  const parsed = startInput.safeParse(await readBody(event));
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: "Invalid study list start input" });
  setLogOperation(event, "study_list.start", { studyListSlug: slug, ...parsed.data });

  const detail = await startStudyList(session.user.id, slug, parsed.data);
  if (!detail) throw createError({ statusCode: 404, statusMessage: "Study list not found" });
  void trackAnalyticsEvent({
    userId: session.user.id,
    event: "study_list_started",
    entityType: "study_list",
    entityId: slug,
    route: `/api/study-lists/${slug}/start`,
    metadata: parsed.data,
  });
  setResponseStatus(event, 201);
  return detail;
});
