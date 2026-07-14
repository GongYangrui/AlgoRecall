export function parseLeetcodeTitleSlug(input: string | URL) {
  let url: URL;
  try {
    url = input instanceof URL ? input : new URL(input);
  } catch {
    return null;
  }
  if (url.hostname !== "leetcode.cn" && url.hostname !== "leetcode.com") return null;
  const match = url.pathname.match(/^\/problems\/([a-z0-9-]+)(?:\/|$)/i);
  return match?.[1]?.toLowerCase() || null;
}

export function buildLeetcodeProblemUrl(currentUrl: string | URL, titleSlug: string) {
  let url: URL;
  try {
    url = currentUrl instanceof URL ? currentUrl : new URL(currentUrl);
  } catch {
    return null;
  }
  if (url.hostname !== "leetcode.cn" && url.hostname !== "leetcode.com") return null;
  if (!/^[a-z0-9-]+$/i.test(titleSlug)) return null;
  return `${url.origin}/problems/${titleSlug.toLowerCase()}/`;
}

export function selectNextDueProblem<T extends { titleSlug: string }>(problems: T[], currentTitleSlug: string) {
  return problems.find((problem) => problem.titleSlug !== currentTitleSlug) || null;
}
