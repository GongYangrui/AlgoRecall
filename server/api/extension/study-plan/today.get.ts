import { buildExtensionTodayProblems, type ExtensionTodayStudyPlanResponse } from "@shared/extension";
import { requireExtensionToken } from "../../../utils/extension-auth";
import { getTodayStudyPlan } from "../../../utils/study-lists";

export default defineEventHandler(async (event): Promise<ExtensionTodayStudyPlanResponse> => {
  const connection = await requireExtensionToken(event);
  const plan = await getTodayStudyPlan(connection.userId);

  return {
    today: plan.today,
    dueProblems: buildExtensionTodayProblems(plan.dueProblems),
  };
});
