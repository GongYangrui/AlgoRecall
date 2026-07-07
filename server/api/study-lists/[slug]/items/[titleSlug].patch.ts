import { createError } from "h3";
import { z } from "zod";
import { studyListModes } from "@shared/study-lists";
import { updateStudyListItemMode } from "../../../../utils/study-lists";
import { requireSession } from "../../../../utils/auth-session";

const updateInput = z.object({
  mode: z.enum(studyListModes),
});

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  const slug = getRouterParam(event, "slug");
  const titleSlug = getRouterParam(event, "titleSlug");
  if (!slug || !titleSlug) throw createError({ statusCode: 400, statusMessage: "Missing study list item" });

  const parsed = updateInput.safeParse(await readBody(event));
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: "Invalid study list item update" });

  const detail = await updateStudyListItemMode(session.user.id, slug, titleSlug, parsed.data.mode);
  if (!detail) throw createError({ statusCode: 404, statusMessage: "Study list item not found" });
  return detail;
});
