import { describe, expect, it } from "vitest";
import {
  getAvatarInitial,
  normalizeNickname,
  shouldShowNavNickname,
  splitGraphemes,
} from "../app/utils/user-display";

describe("user display helpers", () => {
  it("normalizes nicknames and falls back for missing values", () => {
    expect(normalizeNickname("  Gyr04  ")).toBe("Gyr04");
    expect(normalizeNickname("   ")).toBe("");
    expect(getAvatarInitial(null)).toBe("?");
  });

  it("creates initials for English, Chinese, and emoji nicknames", () => {
    expect(getAvatarInitial("gyr04")).toBe("G");
    expect(getAvatarInitial("算法回忆")).toBe("算");
    expect(getAvatarInitial("👩‍💻开发者")).toBe("👩‍💻");
  });

  it("counts user-visible graphemes instead of UTF-16 code units", () => {
    expect(splitGraphemes("👩‍💻e\u0301中")).toEqual(["👩‍💻", "e\u0301", "中"]);
  });

  it("shows nicknames up to eight graphemes and hides longer ones", () => {
    expect(shouldShowNavNickname("一二三四五六七八")).toBe(true);
    expect(shouldShowNavNickname("一二三四五六七八九")).toBe(false);
    expect(shouldShowNavNickname("👩‍💻一二三四五六七")).toBe(true);
    expect(shouldShowNavNickname("👩‍💻一二三四五六七八")).toBe(false);
    expect(shouldShowNavNickname("   ")).toBe(false);
  });
});
