import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  typographer: false,
});

markdown.disable(["image", "table"]);

const defaultLinkOpen =
  markdown.renderer.rules.link_open ||
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

markdown.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx]?.attrSet("target", "_blank");
  tokens[idx]?.attrSet("rel", "noreferrer");
  return defaultLinkOpen(tokens, idx, options, env, self);
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderReviewMarkdown(note: string | null | undefined) {
  if (!note?.trim()) return "";

  try {
    return markdown.render(note);
  } catch {
    return `<p>${escapeHtml(note).replace(/\n/g, "<br>\n")}</p>`;
  }
}
