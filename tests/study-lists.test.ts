import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  calculateStudyListProgress,
  getProblemSourcesFromStudyLists,
  inferStudyListStatusFromProblem,
  isCoveredStudyListStatus,
  selectStudyListQueueBatch,
  studyListItemStatusLabel,
  studyListModeLabel,
} from "../shared/study-lists";
import type { StudyListSnapshot } from "../shared/types";

const studyLists = JSON.parse(readFileSync(join(process.cwd(), "data", "study_lists.json"), "utf8")) as StudyListSnapshot[];

describe("study list helpers", () => {
  it("labels study list item modes and statuses", () => {
    expect(studyListModeLabel("follow_existing")).toBe("依照原进度");
    expect(studyListModeLabel("restart_in_list")).toBe("重新加入");
    expect(studyListItemStatusLabel("planned")).toBe("已入队");
  });

  it("counts queued, covered, and mastered items as progress", () => {
    expect(isCoveredStudyListStatus("not_started")).toBe(false);
    expect(isCoveredStudyListStatus("planned")).toBe(true);
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
    ).toEqual({ total: 5, completed: 4, percent: 80 });
  });

  it("selects the next queue batch by order without backfilling skipped positions", () => {
    const batch = selectStudyListQueueBatch(
      [
        { order: 4, status: "not_started", titleSlug: "d" },
        { order: 1, status: "planned", titleSlug: "a" },
        { order: 3, status: "not_started", titleSlug: "c" },
        { order: 2, status: "not_started", titleSlug: "b" },
      ],
      2,
    );

    expect(batch.map((item) => item.titleSlug)).toEqual(["b", "c"]);
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

  it("lists all built-in study list sources for a problem title slug", () => {
    const sources = getProblemSourcesFromStudyLists("3sum", studyLists);

    expect(sources.map((source) => source.title)).toEqual([
      "Top 100 Liked",
      "Top Interview 150",
      "NeetCode 150",
      "bl75+gl75",
    ]);
  });

  it("merges user progress metadata into built-in study list sources", () => {
    const sources = getProblemSourcesFromStudyLists("3sum", studyLists, [
      { studyListSlug: "top-100-liked", status: "planned", mode: "follow_existing" },
    ]);

    expect(sources.find((source) => source.studyListSlug === "top-100-liked")).toMatchObject({
      title: "Top 100 Liked",
      status: "planned",
      mode: "follow_existing",
    });
    const neetcodeSource = sources.find((source) => source.studyListSlug === "plakya4j");
    expect(neetcodeSource?.title).toBe("NeetCode 150");
    expect(neetcodeSource?.status).toBeUndefined();
    expect(neetcodeSource?.mode).toBeUndefined();
  });

  it("falls back to a manual source for problems outside built-in study lists", () => {
    expect(getProblemSourcesFromStudyLists("not-a-built-in-problem", studyLists)).toEqual([
      { kind: "manual", studyListSlug: null, title: "手动加入" },
    ]);
    expect(getProblemSourcesFromStudyLists(null, studyLists)).toEqual([{ kind: "manual", studyListSlug: null, title: "手动加入" }]);
  });
});
