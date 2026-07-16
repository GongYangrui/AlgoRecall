function parseUrl(input: string | URL) {
  try {
    return input instanceof URL ? input : new URL(input);
  } catch {
    return null;
  }
}

export function getLeetcodeSiteLabel(input: string | URL) {
  const url = parseUrl(input);
  if (url?.hostname === "leetcode.cn") return "LeetCode 中文站";
  if (url?.hostname === "leetcode.com") return "LeetCode 英文站";
  return "LeetCode";
}

export function parseLeetcodeTitleSlug(input: string | URL) {
  const url = parseUrl(input);
  if (!url) return null;
  if (url.hostname !== "leetcode.cn" && url.hostname !== "leetcode.com") return null;
  const match = url.pathname.match(/^\/problems\/([a-z0-9-]+)(?:\/|$)/i);
  return match?.[1]?.toLowerCase() || null;
}

export function buildLeetcodeProblemUrl(currentUrl: string | URL, titleSlug: string) {
  const url = parseUrl(currentUrl);
  if (!url) return null;
  if (url.hostname !== "leetcode.cn" && url.hostname !== "leetcode.com") return null;
  if (!/^[a-z0-9-]+$/i.test(titleSlug)) return null;
  return `${url.origin}/problems/${titleSlug.toLowerCase()}/`;
}

export function selectNextDueProblem<T extends { titleSlug: string }>(problems: T[], currentTitleSlug: string | null) {
  return problems.find((problem) => problem.titleSlug !== currentTitleSlug) || null;
}
