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
