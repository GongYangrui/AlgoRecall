import type {
  ExtensionProblemResponse,
  ExtensionReviewResponse,
  ExtensionTodayProblem,
  ExtensionTodayStudyPlanResponse,
} from "../../shared/extension";
import { difficultyLabel, resultLabel, reviewResultTone, statusLabel } from "../../shared/problems";
import { REVIEW_NOTE_MAX_LENGTH } from "../../shared/reviews";
import { REVIEW_INTERVALS } from "../../shared/schedule";
import type { ReviewResult } from "../../shared/types";
import { orderProblemTitles } from "./presentation";
import { buildLeetcodeProblemUrl, parseLeetcodeTitleSlug, selectNextDueProblem } from "./url";

type RuntimeResponse<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
type ViewState = "checking" | "disconnected" | "connecting" | "loading" | "ready" | "submitting" | "success" | "today" | "not-indexed" | "offline" | "auth-required" | "error";
type QueueState = "idle" | "loading" | "ready" | "offline" | "error";
type PanelView = "record" | "today";

const HOST_ID = "algorecall-extension-root";
const RESULT_OPTIONS: ReviewResult[] = ["easy", "hard", "solution", "mastered"];

const styles = `
:host{all:initial;color-scheme:light;--ar-bg:#fcfcf7;--ar-subtle:#f4f5ec;--ar-border:#e5e7da;--ar-text:#12212c;--ar-muted:#647078;--ar-primary:#078c8c;--ar-primary-ink:#fcfcf7;--ar-info:#4f8fa8;--ar-info-ink:#071b24;--ar-success:#3fae68;--ar-success-ink:#071b10;--ar-warning:#d79b12;--ar-error:#d9544d;--ar-error-ink:#fcfcf7;--ar-shadow:0 18px 48px rgb(18 33 44 / .18);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
:host([data-theme="dark"]){color-scheme:dark;--ar-bg:#172129;--ar-subtle:#202d36;--ar-border:#33434d;--ar-text:#f4f6f1;--ar-muted:#a5b0b7;--ar-primary:#31b8b2;--ar-primary-ink:#071b1b;--ar-info:#73b4cc;--ar-info-ink:#071b24;--ar-success:#5bd58b;--ar-success-ink:#071b10;--ar-warning:#efb847;--ar-error:#ff7b72;--ar-error-ink:#24100e;--ar-shadow:0 18px 58px rgb(0 0 0 / .5)}
*{box-sizing:border-box}.ar-panel{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:320px;color:var(--ar-text);font-size:14px;line-height:1.45}.ar-card{overflow:hidden;border:1px solid var(--ar-border);border-radius:13px;background:var(--ar-bg);box-shadow:var(--ar-shadow)}
button,textarea{font:inherit}.ar-trigger{display:flex;margin-left:auto;align-items:center;gap:9px;min-height:44px;padding:0 15px;border:1px solid var(--ar-border);border-radius:999px;background:var(--ar-bg);color:var(--ar-text);box-shadow:var(--ar-shadow);font-weight:750;cursor:pointer}.ar-trigger:hover{border-color:var(--ar-primary)}.ar-dot{width:8px;height:8px;border-radius:99px;background:var(--ar-primary);box-shadow:0 0 0 4px color-mix(in srgb,var(--ar-primary) 16%,transparent)}
.ar-header{display:flex;align-items:center;gap:10px;padding:13px 14px;border-bottom:1px solid var(--ar-border)}.ar-mark{display:grid;width:31px;height:31px;place-items:center;border-radius:9px;background:var(--ar-primary);color:var(--ar-primary-ink);font-weight:900}.ar-heading{min-width:0;flex:1}.ar-brand{font-size:13px;font-weight:850;letter-spacing:.01em}.ar-title-stack{min-width:0;margin-top:2px}.ar-title-line{overflow:hidden;color:var(--ar-muted);font-size:12px;font-weight:650;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}.ar-title-line+.ar-title-line{margin-top:1px}.ar-icon-btn{display:grid;width:32px;height:32px;place-items:center;border:0;border-radius:8px;background:transparent;color:var(--ar-muted);cursor:pointer}.ar-icon-btn:hover{background:var(--ar-subtle);color:var(--ar-text)}
.ar-body{padding:14px}.ar-tabs{display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-bottom:13px;padding:3px;border-radius:10px;background:var(--ar-subtle)}.ar-tab{min-height:34px;border:0;border-radius:8px;background:transparent;color:var(--ar-muted);font-size:12px;font-weight:800;cursor:pointer}.ar-tab:hover{color:var(--ar-text)}.ar-tab[aria-selected="true"]{background:var(--ar-bg);color:var(--ar-text);box-shadow:0 1px 3px rgb(18 33 44 / .12)}
.ar-kicker{margin:0 0 4px;color:var(--ar-primary);font-size:11px;font-weight:800;letter-spacing:.08em}.ar-h2{margin:0;font-size:18px;line-height:1.25;font-weight:850}.ar-copy{margin:7px 0 0;color:var(--ar-muted);font-size:13px;line-height:1.6}.ar-code{margin:13px 0;padding:10px;border:1px dashed var(--ar-border);border-radius:10px;background:var(--ar-subtle);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;text-align:center;font-weight:850;letter-spacing:.12em}.ar-actions{display:flex;gap:8px;margin-top:14px}.ar-btn{display:inline-flex;min-height:38px;flex:1;align-items:center;justify-content:center;gap:7px;padding:0 12px;border:1px solid var(--ar-border);border-radius:9px;background:var(--ar-bg);color:var(--ar-text);font-weight:750;cursor:pointer}.ar-btn:hover{border-color:var(--ar-primary)}.ar-btn:disabled{cursor:not-allowed;opacity:.55}.ar-btn-primary{border-color:var(--ar-primary);background:var(--ar-primary);color:var(--ar-primary-ink)}.ar-btn-ghost{border-color:transparent;background:var(--ar-subtle)}.ar-link-btn{display:block;width:100%;margin-top:10px;border:0;background:transparent;color:var(--ar-muted);font-size:11px;text-align:center;cursor:pointer}.ar-link-btn:hover{color:var(--ar-primary)}
.ar-progress-summary{margin-bottom:14px;padding:11px 12px;border-radius:10px;background:var(--ar-subtle)}.ar-progress-heading,.ar-progress-meta{display:flex;align-items:center;justify-content:space-between;gap:8px}.ar-progress-heading strong{font-size:12px}.ar-progress-heading span,.ar-progress-meta{color:var(--ar-muted);font-size:10px}.ar-track{display:flex;gap:4px;margin:9px 0 7px}.ar-track-segment{height:6px;flex:1;border-radius:99px;background:var(--ar-border)}.ar-track-segment.active{background:var(--ar-primary)}.ar-progress-empty{display:flex;align-items:center;gap:9px}.ar-progress-empty-mark{display:grid;width:28px;height:28px;flex:0 0 28px;place-items:center;border-radius:99px;background:color-mix(in srgb,var(--ar-primary) 13%,var(--ar-bg));color:var(--ar-primary);font-weight:900}.ar-progress-empty strong,.ar-progress-empty span{display:block}.ar-progress-empty strong{font-size:12px}.ar-progress-empty span{margin-top:2px;color:var(--ar-muted);font-size:10px}
.ar-results{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.ar-result{--ar-tone:var(--ar-primary);display:inline-flex;min-height:43px;align-items:center;justify-content:center;gap:6px;padding:8px 9px;border:1px solid color-mix(in srgb,var(--ar-tone) 35%,var(--ar-border));border-radius:9px;background:color-mix(in srgb,var(--ar-tone) 10%,var(--ar-bg));color:var(--ar-text);font-size:12px;font-weight:800;text-align:center;cursor:pointer}.ar-result[data-tone="error"]{--ar-tone:var(--ar-error)}.ar-result[data-tone="info"]{--ar-tone:var(--ar-info)}.ar-result[data-tone="success"]{--ar-tone:var(--ar-success)}.ar-result:hover{background:color-mix(in srgb,var(--ar-tone) 16%,var(--ar-bg))}.ar-result[aria-busy="true"]{border-color:var(--ar-tone);background:color-mix(in srgb,var(--ar-tone) 18%,var(--ar-bg));box-shadow:inset 0 0 0 1px var(--ar-tone)}.ar-result:disabled{cursor:not-allowed;opacity:.55}.ar-result[aria-busy="true"]{opacity:1}
.ar-label{display:flex;align-items:center;justify-content:space-between;margin:13px 0 6px;font-size:12px;font-weight:750}.ar-count{color:var(--ar-muted);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:500}.ar-note{display:block;width:100%;height:74px;resize:none;padding:9px 10px;border:1px solid var(--ar-border);border-radius:9px;outline:none;background:var(--ar-subtle);color:var(--ar-text);line-height:1.45}.ar-note:focus{border-color:var(--ar-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--ar-primary) 15%,transparent)}.ar-note::placeholder{color:var(--ar-muted)}
.ar-status{display:flex;gap:10px;padding:12px;border-radius:10px;background:var(--ar-subtle)}.ar-status-mark{display:grid;width:30px;height:30px;flex:0 0 30px;place-items:center;border-radius:99px;background:color-mix(in srgb,var(--ar-primary) 14%,var(--ar-bg));color:var(--ar-primary);font-weight:900}.ar-status.error .ar-status-mark{background:color-mix(in srgb,var(--ar-error) 14%,var(--ar-bg));color:var(--ar-error)}.ar-status.success .ar-status-mark{background:color-mix(in srgb,var(--ar-success) 14%,var(--ar-bg));color:var(--ar-success)}.ar-status strong{display:block;font-size:13px}.ar-status p{margin:3px 0 0;color:var(--ar-muted);font-size:12px}.ar-complete{margin-top:10px;color:var(--ar-success);font-size:12px;font-weight:750;text-align:center}.ar-meta{margin-top:12px;padding-top:10px;border-top:1px solid var(--ar-border);color:var(--ar-muted);font-size:11px}.ar-spinner{width:16px;height:16px;border:2px solid currentColor;border-right-color:transparent;border-radius:99px;animation:ar-spin .7s linear infinite}
.ar-queue-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.ar-queue-head strong{font-size:13px}.ar-queue-count,.ar-current-badge{border-radius:99px;background:color-mix(in srgb,var(--ar-primary) 11%,var(--ar-bg));color:var(--ar-primary);font-size:10px;font-weight:800}.ar-queue-count{padding:3px 7px}.ar-queue{max-height:356px;overflow:auto;margin:0 -4px;padding:0 4px;list-style:none}.ar-queue li+li{border-top:1px solid var(--ar-border)}.ar-queue-item{display:grid;width:100%;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 4px;border:0;background:transparent;color:var(--ar-text);text-align:left;cursor:pointer}.ar-queue-item:hover{color:var(--ar-primary)}.ar-queue-item.current{cursor:default}.ar-queue-title{display:grid;min-width:0;grid-template-columns:auto minmax(0,1fr) auto;gap:6px;align-items:start}.ar-queue-titles{min-width:0}.ar-queue-title-line{overflow:hidden;font-size:12px;font-weight:750;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}.ar-queue-title-line+.ar-queue-title-line{margin-top:2px}.ar-number{flex:0 0 auto;padding-top:1px;color:var(--ar-muted);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;font-weight:750}.ar-current-badge{flex:0 0 auto;padding:2px 6px}.ar-queue-meta{margin-top:4px;color:var(--ar-muted);font-size:10px}.ar-queue-stage{color:var(--ar-muted);font-size:10px;text-align:right;white-space:nowrap}.ar-queue-stage strong{display:block;color:var(--ar-text);font-size:11px}.ar-queue-footer{margin-top:10px;padding-top:9px;border-top:1px solid var(--ar-border)}
button:focus-visible,textarea:focus-visible{outline:3px solid color-mix(in srgb,var(--ar-primary) 35%,transparent);outline-offset:2px}@keyframes ar-spin{to{transform:rotate(360deg)}}@media(max-width:460px){.ar-panel{right:10px;bottom:10px;width:min(320px,calc(100vw - 20px))}}@media(prefers-reduced-motion:reduce){.ar-spinner{animation-duration:1.5s}}
`;

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] || char);
}

function displayDate(value: string | null | undefined) {
  if (!value) return "无需排期";
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
  private queueState: QueueState = "idle";
  private activeView: PanelView = "record";
  private connected = false;
  private collapsed = true;
  private slug: string;
  private selected: ReviewResult | null = null;
  private note = "";
  private problem: ExtensionProblemResponse | null = null;
  private todayProblems: ExtensionTodayProblem[] = [];
  private nextReviewAt: string | null = null;
  private errorMessage = "";
  private queueErrorMessage = "";
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
    this.nextReviewAt = null;
    this.idempotencyKey = crypto.randomUUID();
    if (!this.connected) {
      await this.load();
      return;
    }
    await Promise.all([this.loadProblem(), this.loadTodayPlan()]);
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
    if (!this.connected) {
      this.state = "checking";
      this.render();
    }
    try {
      const connection = await send<{ connected: boolean }>({ type: "GET_CONNECTION" });
      if (!connection.connected) {
        this.connected = false;
        this.state = "disconnected";
        this.render();
        return;
      }
      this.connected = true;
      await Promise.all([this.loadProblem(), this.loadTodayPlan()]);
    } catch (error) { this.handleError(error); }
  }

  private async loadProblem() {
    this.state = "loading";
    this.render();
    try {
      this.problem = await send<ExtensionProblemResponse>({ type: "GET_PROBLEM", titleSlug: this.slug });
      this.nextReviewAt = this.problem.problem?.nextReviewAt || this.problem.latestReview?.nextReviewAt || null;
      this.state = this.problem.reviewedToday ? "today" : "ready";
      this.render();
    } catch (error) { this.handleError(error); }
  }

  private async loadTodayPlan() {
    this.queueState = "loading";
    this.queueErrorMessage = "";
    this.render();
    try {
      const plan = await send<ExtensionTodayStudyPlanResponse>({ type: "GET_TODAY_PLAN" });
      this.todayProblems = plan.dueProblems;
      this.queueState = "ready";
      this.render();
    } catch (error) {
      const detail = error as { code?: string; message?: string };
      if (detail.code === "EXTENSION_AUTH_REQUIRED") {
        this.handleError(error);
        return;
      }
      this.queueErrorMessage = detail.message || "今日复习列表加载失败。";
      this.queueState = detail.code === "OFFLINE" ? "offline" : "error";
      this.render();
    }
  }

  private handleError(error: unknown) {
    const detail = error as { code?: string; message?: string };
    this.errorMessage = detail.message || "请求失败，请稍后再试。";
    if (detail.code === "QUESTION_NOT_INDEXED") this.state = "not-indexed";
    else if (detail.code === "EXTENSION_AUTH_REQUIRED") {
      this.connected = false;
      this.state = "auth-required";
    } else if (detail.code === "OFFLINE") this.state = "offline";
    else this.state = "error";
    this.render();
  }

  private title() {
    const question = this.problem?.question;
    if (!question) {
      const fallback = `LeetCode · ${this.slug}`;
      return `<div class="ar-title-stack"><div class="ar-title-line" title="${escapeHtml(fallback)}">${escapeHtml(fallback)}</div></div>`;
    }
    const titles = orderProblemTitles(question, location.href);
    const primary = `${question.questionFrontendId}. ${titles.primary}`;
    return `<div class="ar-title-stack"><div class="ar-title-line" title="${escapeHtml(primary)}">${escapeHtml(primary)}</div>${titles.secondary ? `<div class="ar-title-line" title="${escapeHtml(titles.secondary)}">${escapeHtml(titles.secondary)}</div>` : ""}</div>`;
  }

  private progress() {
    const problem = this.problem?.problem;
    if (!problem) {
      return `<section class="ar-progress-summary" aria-label="当前题目复习进度"><div class="ar-progress-empty"><span class="ar-progress-empty-mark">+</span><div><strong>尚未加入题库</strong><span>本次记录后自动加入题库</span></div></div></section>`;
    }
    const activeStage = problem.status === "mastered"
      ? REVIEW_INTERVALS.length
      : Math.max(0, Math.min(REVIEW_INTERVALS.length, problem.stage));
    const segments = REVIEW_INTERVALS.map((_, index) => `<span class="ar-track-segment${index < activeStage ? " active" : ""}"></span>`).join("");
    return `<section class="ar-progress-summary" aria-label="当前题目复习进度"><div class="ar-progress-heading"><strong>记忆轨道</strong><span>${escapeHtml(statusLabel(problem.status))}</span></div><div class="ar-track" role="img" aria-label="第 ${problem.stage} 阶段，共 ${REVIEW_INTERVALS.length} 阶段">${segments}</div><div class="ar-progress-meta"><span>第 ${problem.stage} 阶段</span><span>复习 ${problem.reviewCount} 次</span></div><div class="ar-progress-meta"><span>下次复习</span><span>${escapeHtml(displayDate(problem.nextReviewAt))}</span></div></section>`;
  }

  private body() {
    if (this.state === "checking") return this.status("…", "正在读取题目", "同步 AlgoRecall 中的记录状态。", false, true);
    if (this.state === "connecting") return `${this.status("↗", "等待网页确认", "已打开 AlgoRecall，请核对验证码并批准连接。", false, true)}${this.pairingCode ? `<div class="ar-code">${escapeHtml(this.pairingCode)}</div>` : ""}`;
    if (this.state === "disconnected" || this.state === "auth-required") {
      return `<p class="ar-kicker">30 天独立连接</p><h2 class="ar-h2">${this.state === "auth-required" ? "连接已失效" : "连接 AlgoRecall"}</h2><p class="ar-copy">批准后即可在题目页记录复习。扩展无法访问你的网站 Cookie 或 LeetCode 编辑器内容。</p><div class="ar-actions"><button class="ar-btn ar-btn-primary" data-action="connect">连接账号</button></div><div class="ar-meta">仅授予题目查询和复习记录权限</div>`;
    }
    if (!this.connected) return this.recordView();
    const count = this.queueState === "ready" ? ` ${this.todayProblems.length}` : "";
    return `<div class="ar-tabs" role="tablist" aria-label="扩展功能"><button id="ar-tab-record" class="ar-tab" role="tab" aria-controls="ar-panel-record" aria-selected="${this.activeView === "record"}" data-view="record">记录</button><button id="ar-tab-today" class="ar-tab" role="tab" aria-controls="ar-panel-today" aria-selected="${this.activeView === "today"}" data-view="today">今日复习${count}</button></div><div id="ar-panel-${this.activeView}" role="tabpanel" aria-labelledby="ar-tab-${this.activeView}">${this.activeView === "record" ? this.recordView() : this.todayView()}</div>`;
  }

  private recordView() {
    if (this.state === "checking" || this.state === "loading") return this.status("…", "正在读取题目", "同步 AlgoRecall 中的记录状态。", false, true);
    if (this.state === "not-indexed") return `${this.status("!", "题目暂未收录", "AlgoRecall 索引中没有这道题，因此不会从页面抓取不完整信息。", true)}<div class="ar-actions"><button class="ar-btn" data-action="retry">重新检查</button></div>`;
    if (this.state === "offline") {
      const actions = this.selected
        ? '<button class="ar-btn ar-btn-primary" data-action="retry-submit">重试本次记录</button><button class="ar-btn ar-btn-ghost" data-action="edit-review">返回修改</button>'
        : '<button class="ar-btn ar-btn-primary" data-action="retry">重试</button>';
      return `${this.status("!", "暂时无法连接", "请检查网络，恢复后可用同一次记录安全重试。", true)}<div class="ar-actions">${actions}</div>`;
    }
    if (this.state === "error") {
      const actions = this.selected
        ? '<button class="ar-btn ar-btn-primary" data-action="retry-submit">重试本次记录</button><button class="ar-btn ar-btn-ghost" data-action="edit-review">返回修改</button>'
        : '<button class="ar-btn" data-action="retry">重试</button>';
      return `${this.status("!", "操作没有完成", escapeHtml(this.errorMessage), true)}<div class="ar-actions">${actions}</div>`;
    }
    if (this.state === "success" || this.state === "today") {
      const intro = this.state === "success" ? "本次复习已记录" : "今天已经记录过";
      return `${this.progress()}${this.status("✓", intro, `下次复习：${escapeHtml(displayDate(this.nextReviewAt))}`, false, false, true)}${this.nextActions()}<button class="ar-link-btn" data-action="manage">管理扩展连接</button>`;
    }
    return `${this.progress()}<p class="ar-kicker">记录一次复习</p><h2 class="ar-h2">这道题做得怎么样？</h2><label class="ar-label" for="ar-note"><span>本次备注，可不填</span><span class="ar-count">${this.note.length}/${REVIEW_NOTE_MAX_LENGTH}</span></label><textarea id="ar-note" class="ar-note" maxlength="${REVIEW_NOTE_MAX_LENGTH}" placeholder="记录这次刷题的收获" ${this.state === "submitting" ? "disabled" : ""}>${escapeHtml(this.note)}</textarea><div class="ar-results">${RESULT_OPTIONS.map((result) => {
      const submitting = this.state === "submitting" && this.selected === result;
      return `<button class="ar-result" data-result="${result}" data-tone="${reviewResultTone(result)}" aria-busy="${submitting}" ${this.state === "submitting" ? "disabled" : ""}>${submitting ? '<span class="ar-spinner"></span>正在记录' : escapeHtml(resultLabel(result))}</button>`;
    }).join("")}</div>`;
  }

  private nextActions() {
    if (this.queueState === "loading") {
      return `<div class="ar-actions"><button class="ar-btn ar-btn-primary" disabled><span class="ar-spinner"></span>正在刷新队列</button><button class="ar-btn ar-btn-ghost" data-action="again">再记一次</button></div>`;
    }
    if (this.queueState === "offline" || this.queueState === "error") {
      return `<div class="ar-actions"><button class="ar-btn ar-btn-primary" data-action="retry-queue">重试今日列表</button><button class="ar-btn ar-btn-ghost" data-action="again">再记一次</button></div>`;
    }
    const next = selectNextDueProblem(this.todayProblems, this.slug);
    if (!next) {
      return `<div class="ar-complete">今天清空了</div><div class="ar-actions"><button class="ar-btn ar-btn-ghost" data-action="again">再记一次</button></div>`;
    }
    return `<div class="ar-actions"><button class="ar-btn ar-btn-primary" data-action="next">下一题</button><button class="ar-btn ar-btn-ghost" data-action="again">再记一次</button></div>`;
  }

  private todayView() {
    if (this.queueState === "idle" || this.queueState === "loading") return this.status("…", "正在读取今日复习", "同步网页端的待复习队列。", false, true);
    if (this.queueState === "offline" || this.queueState === "error") {
      const copy = this.queueState === "offline" ? "请检查网络，恢复后重新加载。" : escapeHtml(this.queueErrorMessage);
      return `${this.status("!", "今日复习加载失败", copy, true)}<div class="ar-actions"><button class="ar-btn ar-btn-primary" data-action="retry-queue">重试</button></div>`;
    }
    if (this.todayProblems.length === 0) {
      return `${this.status("✓", "今天清空了", "复习队列已经没有到期题目。", false, false, true)}<div class="ar-queue-footer"><button class="ar-link-btn" data-action="manage">管理扩展连接</button></div>`;
    }
    const items = this.todayProblems.map((problem) => {
      const current = problem.titleSlug === this.slug;
      const titles = orderProblemTitles(problem, location.href);
      const number = `#${problem.frontendId || "--"}`;
      const accessibleTitle = [number, titles.primary, titles.secondary].filter(Boolean).join(" · ");
      return `<li><button class="ar-queue-item${current ? " current" : ""}" data-slug="${escapeHtml(problem.titleSlug)}" aria-label="${escapeHtml(`${current ? "当前题目" : "打开题目"} ${accessibleTitle}`)}" ${current ? "disabled" : ""}><div><div class="ar-queue-title"><span class="ar-number">${escapeHtml(number)}</span><div class="ar-queue-titles"><div class="ar-queue-title-line" title="${escapeHtml(titles.primary)}">${escapeHtml(titles.primary)}</div>${titles.secondary ? `<div class="ar-queue-title-line" title="${escapeHtml(titles.secondary)}">${escapeHtml(titles.secondary)}</div>` : ""}</div>${current ? '<span class="ar-current-badge">当前</span>' : ""}</div><div class="ar-queue-meta">${escapeHtml(difficultyLabel(problem.difficulty))} · ${escapeHtml(statusLabel(problem.status))}</div></div><span class="ar-queue-stage"><strong>第 ${problem.stage} 阶段</strong>复习 ${problem.reviewCount} 次</span></button></li>`;
    }).join("");
    return `<div class="ar-queue-head"><strong>今日待复习</strong><span class="ar-queue-count">${this.todayProblems.length} 题</span></div><ul class="ar-queue">${items}</ul><div class="ar-queue-footer"><button class="ar-link-btn" data-action="manage">管理扩展连接</button></div>`;
  }

  private status(mark: string, title: string, copy: string, error = false, spinning = false, success = false) {
    return `<div class="ar-status${error ? " error" : ""}${success ? " success" : ""}"><span class="ar-status-mark">${spinning ? '<span class="ar-spinner"></span>' : mark}</span><div><strong>${title}</strong><p>${copy}</p></div></div>`;
  }

  private render() {
    this.root.innerHTML = `<style>${styles}</style><aside class="ar-panel" aria-label="AlgoRecall 复习记录">${this.collapsed
      ? `<button class="ar-trigger" data-action="expand"><span class="ar-dot"></span>AlgoRecall</button>`
      : `<section class="ar-card"><header class="ar-header"><span class="ar-mark">A</span><div class="ar-heading"><div class="ar-brand">AlgoRecall</div>${this.title()}</div><button class="ar-icon-btn" data-action="collapse" aria-label="收起">−</button></header><div class="ar-body" aria-live="polite">${this.body()}</div></section>`}</aside>`;
    this.bind();
  }

  private bind() {
    this.root.querySelector<HTMLElement>("[data-action='expand']")?.addEventListener("click", () => { this.collapsed = false; this.render(); });
    this.root.querySelector<HTMLElement>("[data-action='collapse']")?.addEventListener("click", () => { this.collapsed = true; this.render(); });
    this.root.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => button.addEventListener("click", () => {
      this.activeView = button.dataset.view as PanelView;
      this.render();
    }));
    this.root.querySelector<HTMLElement>("[role='tablist']")?.addEventListener("keydown", (event) => {
      if (!(event instanceof KeyboardEvent) || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      this.activeView = this.activeView === "record" ? "today" : "record";
      this.render();
      this.root.querySelector<HTMLButtonElement>(`[data-view='${this.activeView}']`)?.focus();
    });
    this.root.querySelectorAll<HTMLElement>("[data-result]").forEach((button) => button.addEventListener("click", () => {
      void this.submit(button.dataset.result as ReviewResult);
    }));
    this.root.querySelector<HTMLTextAreaElement>("#ar-note")?.addEventListener("input", (event) => {
      this.note = (event.target as HTMLTextAreaElement).value.slice(0, REVIEW_NOTE_MAX_LENGTH);
      const count = this.root.querySelector<HTMLElement>(".ar-count");
      if (count) count.textContent = `${this.note.length}/${REVIEW_NOTE_MAX_LENGTH}`;
    });
    this.root.querySelector<HTMLElement>("[data-action='connect']")?.addEventListener("click", () => void this.connect());
    this.root.querySelector<HTMLElement>("[data-action='retry']")?.addEventListener("click", () => void this.load());
    this.root.querySelectorAll<HTMLElement>("[data-action='retry-queue']").forEach((button) => button.addEventListener("click", () => void this.loadTodayPlan()));
    this.root.querySelector<HTMLElement>("[data-action='retry-submit']")?.addEventListener("click", () => void this.submit());
    this.root.querySelector<HTMLElement>("[data-action='edit-review']")?.addEventListener("click", () => { this.state = "ready"; this.render(); });
    this.root.querySelector<HTMLElement>("[data-action='next']")?.addEventListener("click", () => this.goNext());
    this.root.querySelector<HTMLElement>("[data-action='again']")?.addEventListener("click", () => { this.selected = null; this.note = ""; this.idempotencyKey = crypto.randomUUID(); this.state = "ready"; this.render(); });
    this.root.querySelectorAll<HTMLElement>("[data-action='manage']").forEach((button) => button.addEventListener("click", () => void send({ type: "OPEN_CONNECTIONS" })));
    this.root.querySelectorAll<HTMLButtonElement>("[data-slug]").forEach((button) => button.addEventListener("click", () => {
      if (button.dataset.slug) this.navigateTo(button.dataset.slug);
    }));
  }

  private navigateTo(titleSlug: string) {
    const url = buildLeetcodeProblemUrl(location.href, titleSlug);
    if (url) location.assign(url);
  }

  private goNext() {
    const next = selectNextDueProblem(this.todayProblems, this.slug);
    if (next) this.navigateTo(next.titleSlug);
  }

  private async connect() {
    this.state = "connecting";
    this.render();
    try {
      await send({ type: "CONNECT", deviceName: `Chrome · ${navigator.platform || "设备"}` });
      this.connected = true;
      await Promise.all([this.loadProblem(), this.loadTodayPlan()]);
    } catch (error) { this.handleError(error); }
  }

  private async submit(result: ReviewResult | null = this.selected) {
    if (!result || this.state === "submitting") return;
    this.selected = result;
    this.state = "submitting";
    this.render();
    try {
      const result = await send<ExtensionReviewResponse>({
        type: "SUBMIT_REVIEW",
        titleSlug: this.slug,
        result: this.selected,
        note: this.note,
        idempotencyKey: this.idempotencyKey,
      });
      this.nextReviewAt = result.problem.nextReviewAt;
      if (this.problem) this.problem.problem = result.problem;
      this.state = "success";
      this.render();
      await this.loadTodayPlan();
    } catch (error) { this.handleError(error); }
  }
}

function bootstrap() {
  const slug = parseLeetcodeTitleSlug(location.href);
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
  };
  addEventListener("popstate", checkUrl);
  new MutationObserver(checkUrl).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(checkUrl, 1_000);
}

if (typeof chrome !== "undefined" && chrome.runtime?.id) bootstrap();
