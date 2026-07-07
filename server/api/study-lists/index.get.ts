import { listStudyListSummaries } from "../../utils/study-lists";
import { requireSession } from "../../utils/auth-session";

export default defineEventHandler(async (event) => {
  const session = await requireSession(event);
  return listStudyListSummaries(session.user.id);
});
