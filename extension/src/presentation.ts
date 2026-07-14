type ProblemTitleSource = {
  title: string;
  titleCn: string | null;
};

export type OrderedProblemTitles = {
  primary: string;
  secondary: string | null;
};

function normalizedTitle(value: string | null | undefined) {
  return value?.trim() || null;
}

function isChineseLeetcodeSite(currentUrl: string | URL) {
  try {
    const url = currentUrl instanceof URL ? currentUrl : new URL(currentUrl);
    return url.hostname === "leetcode.cn";
  } catch {
    return false;
  }
}

export function orderProblemTitles(
  problem: ProblemTitleSource,
  currentUrl: string | URL,
): OrderedProblemTitles {
  const english = normalizedTitle(problem.title);
  const chinese = normalizedTitle(problem.titleCn);
  const ordered = isChineseLeetcodeSite(currentUrl)
    ? [chinese, english]
    : [english, chinese];
  const unique = ordered.filter((title, index, titles): title is string => Boolean(
    title && titles.findIndex((candidate) => candidate?.toLocaleLowerCase() === title.toLocaleLowerCase()) === index,
  ));

  return {
    primary: unique[0] || english || chinese || "未知题目",
    secondary: unique[1] || null,
  };
}
