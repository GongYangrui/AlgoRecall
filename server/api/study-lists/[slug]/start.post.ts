import { createError } from "h3";
import { z } from "zod";
import { studyListModes } from "@shared/study-lists";
import { startStudyList } from "../../../utils/study-lists";
import { requireSession } from "../../../utils/auth-session";

const startInput = z.object({
  dailyNewCount: z.number().int().min(0).max(20).optional(),
  mode: z.enum(studyListModes).optional(),
});

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const slug = getRouterParam(event, "slug");
  if (!slug) throw createError({ statusCode: 400, statusMessage: "Missing study list slug" });

  const parsed = startInput.safeParse(await readBody(event));
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: "Invalid study list start input" });

  const detail = await startStudyList(session.user.id, slug, parsed.data);
  if (!detail) throw createError({ statusCode: 404, statusMessage: "Study list not found" });
  setResponseStatus(event, 201);
  return detail;
});
