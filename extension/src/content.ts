type ReviewResult = "easy" | "hard" | "solution" | "mastered";
type ProblemData = {
  question: { titleSlug: string; questionFrontendId: string; title: string; titleCn: string | null; difficulty: string };
  problem: { nextReviewAt: string | null; reviewCount: number } | null;
  reviewedToday: boolean;
  latestReview: { result: ReviewResult; nextReviewAt: string | null } | null;
};
type ReviewData = { problem: { nextReviewAt: string | null; reviewCount: number }; review: { result: ReviewResult } };
type RuntimeResponse<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
type ViewState = "checking" | "disconnected" | "connecting" | "loading" | "ready" | "submitting" | "success" | "today" | "not-indexed" | "offline" | "auth-required" | "error";

const HOST_ID = "algorecall-extension-root";
const RESULT_OPTIONS: Array<{ value: ReviewResult; label: string; hint: string }> = [
  { value: "easy", label: "顺利做出", hint: "按当前阶段推进" },
  { value: "hard", label: "有些吃力", hint: "保留阶段，尽快再看" },
  { value: "solution", label: "看了题解", hint: "回退阶段，明天复习" },
  { value: "mastered", label: "已经掌握", hint: "结束常规复习" },
];

function parseLeetcodeTitleSlug(input: string | URL) {
  let url: URL;
  try { url = input instanceof URL ? input : new URL(input); } catch { return null; }
  if (url.hostname !== "leetcode.cn" && url.hostname !== "leetcode.com") return null;
  return url.pathname.match(/^\/problems\/([a-z0-9-]+)(?:\/|$)/i)?.[1]?.toLowerCase() || null;
}

const styles = `
:host{all:initial;color-scheme:light;--ar-bg:#fcfcf7;--ar-subtle:#f2f4eb;--ar-border:#dfe3d6;--ar-text:#12212c;--ar-muted:#647078;--ar-primary:#078c8c;--ar-primary-ink:#fff;--ar-error:#d9544d;--ar-success:#2f9d60;--ar-shadow:0 18px 54px rgba(4,14,22,.22);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
:host([data-theme="dark"]){color-scheme:dark;--ar-bg:#172129;--ar-subtle:#202d36;--ar-border:#33434d;--ar-text:#f4f6f1;--ar-muted:#a5b0b7;--ar-primary:#31b8b2;--ar-primary-ink:#071b1b;--ar-error:#ff7b72;--ar-success:#5bd58b;--ar-shadow:0 18px 58px rgba(0,0,0,.5)}
*{box-sizing:border-box}.ar-panel{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:320px;color:var(--ar-text);font-size:14px;line-height:1.45}.ar-card{overflow:hidden;border:1px solid var(--ar-border);border-radius:14px;background:var(--ar-bg);box-shadow:var(--ar-shadow)}
button,textarea{font:inherit}.ar-trigger{display:flex;margin-left:auto;align-items:center;gap:9px;min-height:44px;padding:0 15px;border:1px solid var(--ar-border);border-radius:999px;background:var(--ar-bg);color:var(--ar-text);box-shadow:var(--ar-shadow);font-weight:750;cursor:pointer}.ar-trigger:hover{border-color:var(--ar-primary)}.ar-dot{width:8px;height:8px;border-radius:99px;background:var(--ar-primary);box-shadow:0 0 0 4px color-mix(in srgb,var(--ar-primary) 16%,transparent)}
.ar-header{display:flex;align-items:center;gap:10px;padding:13px 14px;border-bottom:1px solid var(--ar-border)}.ar-mark{display:grid;width:31px;height:31px;place-items:center;border-radius:9px;background:var(--ar-primary);color:var(--ar-primary-ink);font-weight:900}.ar-heading{min-width:0;flex:1}.ar-brand{font-size:13px;font-weight:850;letter-spacing:.01em}.ar-title{overflow:hidden;margin-top:1px;color:var(--ar-muted);font-size:12px;text-overflow:ellipsis;white-space:nowrap}.ar-icon-btn{display:grid;width:32px;height:32px;place-items:center;border:0;border-radius:8px;background:transparent;color:var(--ar-muted);cursor:pointer}.ar-icon-btn:hover{background:var(--ar-subtle);color:var(--ar-text)}
.ar-body{padding:14px}.ar-kicker{margin:0 0 4px;color:var(--ar-primary);font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.ar-h2{margin:0;font-size:18px;line-height:1.25;font-weight:850}.ar-copy{margin:7px 0 0;color:var(--ar-muted);font-size:13px;line-height:1.6}.ar-code{margin:13px 0;padding:10px;border:1px dashed var(--ar-border);border-radius:10px;background:var(--ar-subtle);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;text-align:center;font-weight:850;letter-spacing:.12em}.ar-actions{display:flex;gap:8px;margin-top:14px}.ar-btn{display:inline-flex;min-height:38px;flex:1;align-items:center;justify-content:center;gap:7px;padding:0 12px;border:1px solid var(--ar-border);border-radius:9px;background:var(--ar-bg);color:var(--ar-text);font-weight:750;cursor:pointer}.ar-btn:hover{border-color:var(--ar-primary)}.ar-btn:disabled{cursor:not-allowed;opacity:.55}.ar-btn-primary{border-color:var(--ar-primary);background:var(--ar-primary);color:var(--ar-primary-ink)}.ar-btn-ghost{border-color:transparent;background:var(--ar-subtle)}
.ar-results{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.ar-result{min-height:57px;padding:8px 9px;border:1px solid var(--ar-border);border-radius:10px;background:var(--ar-bg);color:var(--ar-text);text-align:left;cursor:pointer}.ar-result strong,.ar-result span{display:block}.ar-result strong{font-size:13px}.ar-result span{margin-top:2px;color:var(--ar-muted);font-size:10px}.ar-result:hover,.ar-result[aria-pressed="true"]{border-color:var(--ar-primary);background:color-mix(in srgb,var(--ar-primary) 9%,var(--ar-bg))}.ar-result[aria-pressed="true"]{box-shadow:inset 0 0 0 1px var(--ar-primary)}
.ar-label{display:flex;align-items:center;justify-content:space-between;margin:13px 0 6px;font-size:12px;font-weight:750}.ar-count{color:var(--ar-muted);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:500}.ar-note{display:block;width:100%;height:74px;resize:none;padding:9px 10px;border:1px solid var(--ar-border);border-radius:10px;outline:none;background:var(--ar-subtle);color:var(--ar-text);line-height:1.45}.ar-note:focus{border-color:var(--ar-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--ar-primary) 15%,transparent)}.ar-note::placeholder{color:var(--ar-muted)}
.ar-status{display:flex;gap:10px;padding:12px;border-radius:10px;background:var(--ar-subtle)}.ar-status-mark{display:grid;width:30px;height:30px;flex:0 0 30px;place-items:center;border-radius:99px;background:color-mix(in srgb,var(--ar-primary) 14%,var(--ar-bg));color:var(--ar-primary);font-weight:900}.ar-status.error .ar-status-mark{background:color-mix(in srgb,var(--ar-error) 14%,var(--ar-bg));color:var(--ar-error)}.ar-status.success .ar-status-mark{background:color-mix(in srgb,var(--ar-success) 14%,var(--ar-bg));color:var(--ar-success)}.ar-status strong{display:block;font-size:13px}.ar-status p{margin:3px 0 0;color:var(--ar-muted);font-size:12px}.ar-meta{margin-top:12px;padding-top:10px;border-top:1px solid var(--ar-border);color:var(--ar-muted);font-size:11px}.ar-spinner{width:16px;height:16px;border:2px solid currentColor;border-right-color:transparent;border-radius:99px;animation:ar-spin .7s linear infinite}
button:focus-visible,textarea:focus-visible{outline:3px solid color-mix(in srgb,var(--ar-primary) 35%,transparent);outline-offset:2px}@keyframes ar-spin{to{transform:rotate(360deg)}}@media(max-width:460px){.ar-panel{right:10px;bottom:10px;width:min(320px,calc(100vw - 20px))}}@media(prefers-reduced-motion:reduce){.ar-spinner{animation-duration:1.5s}}
`;

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] || char);
}

function displayDate(value: string | null | undefined) {
  if (!value) return "不再安排常规复习";
  return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short" }).format(new Date(`${value}T00:00:00`));
}

async function send<T>(message: object): Promise<T> {
  const response = await chrome.runtime.sendMessage(message) as RuntimeResponse<T> | undefined;
  if (!response) throw { code: "OFFLINE", message: "扩展后台没有响应" };
  if (!response.ok) throw response.error;
  return response.data;
}

class RecallPanel {
  private host: HTMLElement;
  private root: ShadowRoot;
  private state: ViewState = "checking";
  private collapsed = true;
  private slug: string;
  private selected: ReviewResult | null = null;
  private note = "";
  private problem: ProblemData | null = null;
  private nextReviewAt: string | null = null;
  private errorMessage = "";
  private pairingCode = "";
  private idempotencyKey = crypto.randomUUID();

  constructor(slug: string) {
    this.slug = slug;
    this.host = document.createElement("div");
    this.host.id = HOST_ID;
    this.root = this.host.attachShadow({ mode: "closed" });
    document.documentElement.append(this.host);
    this.detectTheme();
    this.render();
    void this.load();
  }

  destroy() { this.host.remove(); }

  setPairingCode(code: string) {
    this.pairingCode = code;
    if (this.state === "connecting") this.render();
  }

  async changeProblem(slug: string) {
    if (slug === this.slug) return;
    this.slug = slug;
    this.problem = null;
    this.selected = null;
    this.note = "";
    this.idempotencyKey = crypto.randomUUID();
    this.state = "loading";
    this.render();
    await this.loadProblem();
  }

  private detectTheme() {
    const update = () => {
      const color = getComputedStyle(document.body || document.documentElement).backgroundColor;
      const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number) || [255, 255, 255];
      const [r = 255, g = 255, b = 255] = channels;
      const dark = (r * 299 + g * 587 + b * 114) / 1000 < 135 || matchMedia("(prefers-color-scheme: dark)").matches;
      this.host.dataset.theme = dark ? "dark" : "light";
    };
    update();
    new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", update);
  }

  private async load() {
    try {
      const connection = await send<{ connected: boolean }>({ type: "GET_CONNECTION" });
      if (!connection.connected) {
        this.state = "disconnected";
        this.render();
        return;
      }
      await this.loadProblem();
    } catch (error) { this.handleError(error); }
  }

  private async loadProblem() {
    this.state = "loading";
    this.render();
    try {
      this.problem = await send<ProblemData>({ type: "GET_PROBLEM", titleSlug: this.slug });
      this.nextReviewAt = this.problem.problem?.nextReviewAt || this.problem.latestReview?.nextReviewAt || null;
      this.state = this.problem.reviewedToday ? "today" : "ready";
      this.render();
    } catch (error) { this.handleError(error); }
  }

  private handleError(error: unknown) {
    const detail = error as { code?: string; message?: string };
    this.errorMessage = detail.message || "请求失败，请稍后再试。";
    if (detail.code === "QUESTION_NOT_INDEXED") this.state = "not-indexed";
    else if (detail.code === "EXTENSION_AUTH_REQUIRED") this.state = "auth-required";
    else if (detail.code === "OFFLINE") this.state = "offline";
    else this.state = "error";
    this.render();
  }

  private title() {
    const question = this.problem?.question;
    if (!question) return `LeetCode · ${this.slug}`;
    return `${question.questionFrontendId}. ${question.titleCn || question.title}`;
  }

  private body() {
    if (this.state === "checking" || this.state === "loading") return this.status("…", "正在读取题目", "同步 AlgoRecall 中的记录状态。", false, true);
    if (this.state === "connecting") return `${this.status("↗", "等待网页确认", "已打开 AlgoRecall，请核对验证码并批准连接。", false, true)}${this.pairingCode ? `<div class="ar-code">${escapeHtml(this.pairingCode)}</div>` : ""}`;
    if (this.state === "disconnected" || this.state === "auth-required") {
      return `<p class="ar-kicker">30 天独立连接</p><h2 class="ar-h2">${this.state === "auth-required" ? "连接已失效" : "连接 AlgoRecall"}</h2><p class="ar-copy">批准后即可在题目页记录复习。扩展无法访问你的网站 Cookie 或 LeetCode 编辑器内容。</p><div class="ar-actions"><button class="ar-btn ar-btn-primary" data-action="connect">连接账号</button></div><div class="ar-meta">仅授予题目查询和复习记录权限</div>`;
    }
    if (this.state === "not-indexed") return `${this.status("!", "题目暂未收录", "AlgoRecall 索引中没有这道题，因此不会从页面抓取不完整信息。", true)}<div class="ar-actions"><button class="ar-btn" data-action="retry">重新检查</button></div>`;
    if (this.state === "offline") return `${this.status("!", "暂时无法连接", "请检查网络，恢复后可用同一次记录安全重试。", true)}<div class="ar-actions"><button class="ar-btn ar-btn-primary" data-action="retry">重试</button></div>`;
    if (this.state === "error") return `${this.status("!", "操作没有完成", escapeHtml(this.errorMessage), true)}<div class="ar-actions"><button class="ar-btn" data-action="retry">重试</button></div>`;
    if (this.state === "success" || this.state === "today") {
      const intro = this.state === "success" ? "本次复习已记录" : "今天已经记录过";
      return `${this.status("✓", intro, `下次复习：${displayDate(this.nextReviewAt)}`, false, false, true)}<div class="ar-actions"><button class="ar-btn ar-btn-primary" data-action="again">再记一次</button><button class="ar-btn ar-btn-ghost" data-action="manage">管理连接</button></div>`;
    }
    return `<p class="ar-kicker">记录本次结果</p><h2 class="ar-h2">这道题做得怎么样？</h2><div class="ar-results">${RESULT_OPTIONS.map((item) => `<button class="ar-result" data-result="${item.value}" aria-pressed="${this.selected === item.value}"><strong>${item.label}</strong><span>${item.hint}</span></button>`).join("")}</div><label class="ar-label" for="ar-note"><span>备注（可选）</span><span class="ar-count">${this.note.length}/500</span></label><textarea id="ar-note" class="ar-note" maxlength="500" placeholder="记下卡住的边界、思路或模板…">${escapeHtml(this.note)}</textarea><div class="ar-actions"><button class="ar-btn ar-btn-primary" data-action="submit" ${!this.selected || this.state === "submitting" ? "disabled" : ""}>${this.state === "submitting" ? '<span class="ar-spinner"></span>正在记录' : "记录到 AlgoRecall"}</button></div>`;
  }

  private status(mark: string, title: string, copy: string, error = false, spinning = false, success = false) {
    return `<div class="ar-status${error ? " error" : ""}${success ? " success" : ""}"><span class="ar-status-mark">${spinning ? '<span class="ar-spinner"></span>' : mark}</span><div><strong>${title}</strong><p>${copy}</p></div></div>`;
  }

  private render() {
    this.root.innerHTML = `<style>${styles}</style><aside class="ar-panel" aria-label="AlgoRecall 复习记录">${this.collapsed
      ? `<button class="ar-trigger" data-action="expand"><span class="ar-dot"></span>AlgoRecall</button>`
      : `<section class="ar-card"><header class="ar-header"><span class="ar-mark">A</span><div class="ar-heading"><div class="ar-brand">AlgoRecall</div><div class="ar-title">${escapeHtml(this.title())}</div></div><button class="ar-icon-btn" data-action="collapse" aria-label="收起">−</button></header><div class="ar-body" aria-live="polite">${this.body()}</div></section>`}</aside>`;
    this.bind();
  }

  private bind() {
    this.root.querySelector<HTMLElement>("[data-action='expand']")?.addEventListener("click", () => { this.collapsed = false; this.render(); });
    this.root.querySelector<HTMLElement>("[data-action='collapse']")?.addEventListener("click", () => { this.collapsed = true; this.render(); });
    this.root.querySelectorAll<HTMLElement>("[data-result]").forEach((button) => button.addEventListener("click", () => { this.selected = button.dataset.result as ReviewResult; this.render(); }));
    this.root.querySelector<HTMLTextAreaElement>("#ar-note")?.addEventListener("input", (event) => {
      this.note = (event.target as HTMLTextAreaElement).value.slice(0, 500);
      const count = this.root.querySelector<HTMLElement>(".ar-count");
      if (count) count.textContent = `${this.note.length}/500`;
    });
    this.root.querySelector<HTMLElement>("[data-action='connect']")?.addEventListener("click", () => void this.connect());
    this.root.querySelector<HTMLElement>("[data-action='retry']")?.addEventListener("click", () => void this.load());
    this.root.querySelector<HTMLElement>("[data-action='submit']")?.addEventListener("click", () => void this.submit());
    this.root.querySelector<HTMLElement>("[data-action='again']")?.addEventListener("click", () => { this.selected = null; this.note = ""; this.idempotencyKey = crypto.randomUUID(); this.state = "ready"; this.render(); });
    this.root.querySelector<HTMLElement>("[data-action='manage']")?.addEventListener("click", () => void send({ type: "OPEN_CONNECTIONS" }));
  }

  private async connect() {
    this.state = "connecting";
    this.render();
    try {
      await send({ type: "CONNECT", deviceName: `Chrome · ${navigator.platform || "设备"}` });
      await this.loadProblem();
    } catch (error) { this.handleError(error); }
  }

  private async submit() {
    if (!this.selected || this.state === "submitting") return;
    this.state = "submitting";
    this.render();
    try {
      const result = await send<ReviewData>({
        type: "SUBMIT_REVIEW",
        titleSlug: this.slug,
        result: this.selected,
        note: this.note,
        idempotencyKey: this.idempotencyKey,
      });
      this.nextReviewAt = result.problem.nextReviewAt;
      this.state = "success";
      this.render();
    } catch (error) { this.handleError(error); }
  }
}

function bootstrap() {
  let slug = parseLeetcodeTitleSlug(location.href);
  if (!slug) return;
  let panel = new RecallPanel(slug);
  chrome.runtime.onMessage.addListener((message: { type?: string; userCode?: string }) => {
    if (message.type === "PAIRING_STARTED" && message.userCode) panel.setPairingCode(message.userCode);
  });
  let lastUrl = location.href;
  const checkUrl = () => {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    const nextSlug = parseLeetcodeTitleSlug(location.href);
    if (!nextSlug) {
      panel.destroy();
      return;
    }
    if (!document.getElementById(HOST_ID)) panel = new RecallPanel(nextSlug);
    else void panel.changeProblem(nextSlug);
    slug = nextSlug;
  };
  addEventListener("popstate", checkUrl);
  new MutationObserver(checkUrl).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(checkUrl, 1_000);
}

if (typeof chrome !== "undefined" && chrome.runtime?.id) bootstrap();
