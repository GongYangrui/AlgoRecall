type ProblemTitleSource = {
  title: string;
  titleCn: string | null;
};

function normalizedTitle(value: string | null | undefined) {
  return value?.trim() || null;
}

export function formatProblemTitle(problem: ProblemTitleSource) {
  const english = normalizedTitle(problem.title);
  const chinese = normalizedTitle(problem.titleCn);
  const unique = [chinese, english].filter((title, index, titles): title is string => Boolean(
    title && titles.findIndex((candidate) => candidate?.toLocaleLowerCase() === title.toLocaleLowerCase()) === index,
  ));

  return unique.join(" · ") || "未知题目";
}
