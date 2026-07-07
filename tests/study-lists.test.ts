import { describe, expect, it } from "vitest";
import {
  calculateStudyListProgress,
  inferStudyListStatusFromProblem,
  isCoveredStudyListStatus,
  studyListItemStatusLabel,
  studyListModeLabel,
} from "../shared/study-lists";

describe("study list helpers", () => {
  it("labels study list item modes and statuses", () => {
    expect(studyListModeLabel("follow_existing")).toBe("依照原进度");
    expect(studyListModeLabel("restart_in_list")).toBe("题单内重学");
    expect(studyListItemStatusLabel("covered")).toBe("已覆盖");
  });

  it("counts learned, covered, and mastered items as progress", () => {
    expect(isCoveredStudyListStatus("not_started")).toBe(false);
    expect(isCoveredStudyListStatus("planned")).toBe(false);
    expect(isCoveredStudyListStatus("learned")).toBe(true);
    expect(isCoveredStudyListStatus("covered")).toBe(true);
    expect(isCoveredStudyListStatus("mastered")).toBe(true);

    expect(
      calculateStudyListProgress([
        { status: "not_started" },
        { status: "planned" },
        { status: "learned" },
        { status: "covered" },
        { status: "mastered" },
      ]),
    ).toEqual({ total: 5, completed: 3, percent: 60 });
  });

  it("infers list coverage from existing problem progress", () => {
    expect(inferStudyListStatusFromProblem(null)).toBe("not_started");
    expect(inferStudyListStatusFromProblem({ status: "new", reviewCount: 0 })).toBe("not_started");
    expect(inferStudyListStatusFromProblem({ status: "new", reviewCount: 1 })).toBe("covered");
    expect(inferStudyListStatusFromProblem({ status: "reviewing", reviewCount: 0 })).toBe("covered");
    expect(inferStudyListStatusFromProblem({ status: "mastered", reviewCount: 2 })).toBe("mastered");
  });

  it("does not count existing progress when an item is set to restart in the list", () => {
    expect(inferStudyListStatusFromProblem({ status: "mastered", reviewCount: 5 }, "restart_in_list")).toBe("not_started");
  });
});
