import { describe, expect, it } from "vitest";
import { renderReviewMarkdown } from "../shared/markdown";

describe("renderReviewMarkdown", () => {
  it("renders headings, lists, emphasis, inline code, and code blocks", () => {
    const html = renderReviewMarkdown(`# 标题

- item
1. ordered

**重点** 和 \`dp[i]\`

\`\`\`ts
const answer = 42
\`\`\``);

    expect(html).toContain("<h1>标题</h1>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<ol>");
    expect(html).toContain("<strong>重点</strong>");
    expect(html).toContain("<code>dp[i]</code>");
    expect(html).toContain("<pre><code class=\"language-ts\">");
  });

  it("renders safe links with target and rel attributes", () => {
    const html = renderReviewMarkdown("[LeetCode](https://leetcode.cn)");

    expect(html).toContain('href="https://leetcode.cn"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer"');
  });

  it("escapes raw HTML instead of injecting it", () => {
    const html = renderReviewMarkdown("<script>alert(1)</script>");

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("does not create dangerous javascript links", () => {
    const html = renderReviewMarkdown("[x](javascript:alert(1))");

    expect(html).not.toContain('href="javascript:alert(1)"');
  });
});
