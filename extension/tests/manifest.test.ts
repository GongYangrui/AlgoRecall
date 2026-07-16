import { describe, expect, it } from "vitest";
import { createManifest } from "../vite.config";

describe("extension manifest", () => {
  it("uses one API origin and least privilege", () => {
    const manifest = createManifest("https://algorecall.rayspace.top");
    expect(manifest.permissions).toEqual(["storage"]);
    expect(manifest.host_permissions).toEqual(["https://algorecall.rayspace.top/*"]);
    expect(JSON.stringify(manifest)).not.toContain("<all_urls>");
    expect(manifest.content_scripts[0]?.matches).toEqual([
      "https://leetcode.cn/*",
      "https://leetcode.com/*",
    ]);
    expect(manifest.description).toContain("任意页面");
  });
});
