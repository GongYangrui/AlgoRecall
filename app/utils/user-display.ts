export const NAV_NICKNAME_LIMIT = 8;

const graphemeSegmenter = typeof Intl !== "undefined" && "Segmenter" in Intl
  ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
  : null;

export function normalizeNickname(name: string | null | undefined) {
  return name?.trim() || "";
}

export function splitGraphemes(value: string) {
  if (!value) return [];
  if (!graphemeSegmenter) return Array.from(value);
  return Array.from(graphemeSegmenter.segment(value), ({ segment }) => segment);
}

export function getAvatarInitial(name: string | null | undefined) {
  const [initial] = splitGraphemes(normalizeNickname(name));
  return initial ? initial.toUpperCase() : "?";
}

export function shouldShowNavNickname(name: string | null | undefined) {
  const nickname = normalizeNickname(name);
  return nickname.length > 0 && splitGraphemes(nickname).length <= NAV_NICKNAME_LIMIT;
}
