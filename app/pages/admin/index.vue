<script setup lang="ts">
import { buildDiagnosticPayload } from "@shared/logging";
import type { AdminDailyMetric, AdminLogEntry, AdminOverview } from "@shared/types/admin";

definePageMeta({ middleware: "admin" });

const activeTab = ref<"overview" | "logs">("overview");

const overview = ref<AdminOverview | null>(null);
const trend = ref<AdminDailyMetric[]>([]);
const recentErrors = ref<AdminLogEntry[]>([]);
const loadingOverview = ref(false);

const logEntries = ref<AdminLogEntry[]>([]);
const logTotal = ref(0);
const logPage = ref(1);
const logPageSize = ref(20);
const loadingLogs = ref(false);
const expandedId = ref<string | null>(null);
const copiedId = ref<string | null>(null);
const logFilters = reactive({
  level: "",
  source: "",
  event: "",
  route: "",
  statusCode: "",
  requestId: "",
  appVersion: "",
  from: "",
  to: "",
  q: "",
});

const levelBadge: Record<string, string> = {
  error: "badge-error",
  warn: "badge-warning",
  info: "badge-info",
  audit: "badge-neutral",
};

const totalPages = computed(() => Math.max(1, Math.ceil(logTotal.value / logPageSize.value)));
const trendMax = computed(() => {
  const values = trend.value.flatMap((item) => [item.activeUsers, item.startedItems, item.reviews, item.errors]);
  return Math.max(1, ...values);
});

async function fetchOverview() {
  loadingOverview.value = true;
  try {
    const [overviewData, trendData, logsData] = await Promise.all([
      $fetch<AdminOverview>("/api/admin/overview"),
      $fetch<{ items: AdminDailyMetric[] }>("/api/admin/analytics"),
      $fetch<{ items: AdminLogEntry[] }>("/api/admin/logs?level=error&pageSize=8"),
    ]);
    overview.value = overviewData;
    trend.value = trendData.items;
    recentErrors.value = logsData.items;
  } finally {
    loadingOverview.value = false;
  }
}

async function fetchLogs() {
  loadingLogs.value = true;
  try {
    const params = new URLSearchParams();
    params.set("page", String(logPage.value));
    params.set("pageSize", String(logPageSize.value));
    if (logFilters.level) params.set("level", logFilters.level);
    if (logFilters.source) params.set("source", logFilters.source);
    if (logFilters.event) params.set("event", logFilters.event);
    if (logFilters.route) params.set("route", logFilters.route);
    if (logFilters.statusCode) params.set("statusCode", logFilters.statusCode);
    if (logFilters.requestId) params.set("requestId", logFilters.requestId);
    if (logFilters.appVersion) params.set("appVersion", logFilters.appVersion);
    if (logFilters.from) params.set("from", logFilters.from);
    if (logFilters.to) params.set("to", logFilters.to);
    if (logFilters.q) params.set("q", logFilters.q);

    const data = await $fetch<{ items: AdminLogEntry[]; total: number }>(`/api/admin/logs?${params.toString()}`);
    logEntries.value = data.items;
    logTotal.value = data.total;
  } finally {
    loadingLogs.value = false;
  }
}

function onTabChange(tab: "overview" | "logs") {
  activeTab.value = tab;
  if (tab === "logs" && logEntries.value.length === 0) fetchLogs();
}

function onLogFilter() {
  logPage.value = 1;
  expandedId.value = null;
  fetchLogs();
}

function resetFilters() {
  logFilters.level = "";
  logFilters.source = "";
  logFilters.event = "";
  logFilters.route = "";
  logFilters.statusCode = "";
  logFilters.requestId = "";
  logFilters.appVersion = "";
  logFilters.from = "";
  logFilters.to = "";
  logFilters.q = "";
  onLogFilter();
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-CN");
}

function formatUptime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours} 小时 ${minutes} 分` : `${minutes} 分 ${seconds % 60} 秒`;
}

function barWidth(value: number) {
  return `${Math.max(4, Math.round((value / trendMax.value) * 100))}%`;
}

async function copyDiagnostic(entry: AdminLogEntry) {
  const payload = buildDiagnosticPayload(entry);
  await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  copiedId.value = entry.id;
  window.setTimeout(() => {
    if (copiedId.value === entry.id) copiedId.value = null;
  }, 1600);
}

onMounted(fetchOverview);
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <div class="navbar content-wrap px-0 py-4">
      <div class="navbar-start">
        <NuxtLink to="/" class="btn btn-ghost px-0 text-xl font-black">AlgoRecall</NuxtLink>
        <span class="ml-3 text-sm text-base-content/50">管理后台</span>
      </div>
      <div class="navbar-end">
        <NuxtLink to="/" class="btn btn-ghost btn-sm">返回首页</NuxtLink>
      </div>
    </div>

    <main class="content-wrap pb-10">
      <div role="tablist" class="tabs tabs-box mb-6 inline-flex">
        <button role="tab" class="tab" :class="{ 'tab-active': activeTab === 'overview' }" @click="onTabChange('overview')">
          运营总览
        </button>
        <button role="tab" class="tab" :class="{ 'tab-active': activeTab === 'logs' }" @click="onTabChange('logs')">
          错误日志
        </button>
      </div>

      <section v-if="activeTab === 'overview'">
        <div v-if="loadingOverview" class="flex justify-center py-20">
          <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>

        <div v-else-if="overview" class="space-y-6">
          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div class="card bg-base-100 shadow-sm">
              <div class="card-body">
                <p class="text-sm text-base-content/50">今日活跃用户</p>
                <p class="text-3xl font-black">{{ overview.todayActiveUsers }}</p>
              </div>
            </div>
            <div class="card bg-base-100 shadow-sm">
              <div class="card-body">
                <p class="text-sm text-base-content/50">近 7 日活跃用户</p>
                <p class="text-3xl font-black">{{ overview.activeUsers7d }}</p>
              </div>
            </div>
            <div class="card bg-base-100 shadow-sm">
              <div class="card-body">
                <p class="text-sm text-base-content/50">今日开始新题</p>
                <p class="text-3xl font-black">{{ overview.todayStartedItems }}</p>
              </div>
            </div>
            <div class="card bg-base-100 shadow-sm">
              <div class="card-body">
                <p class="text-sm text-base-content/50">今日复习提交</p>
                <p class="text-3xl font-black">{{ overview.todayReviews }}</p>
              </div>
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div class="card bg-base-100 shadow-sm">
              <div class="card-body">
                <p class="text-sm text-base-content/50">24h 错误数</p>
                <p class="text-3xl font-black" :class="overview.errorCount24h === 0 ? 'text-success' : 'text-error'">
                  {{ overview.errorCount24h }}
                </p>
              </div>
            </div>
            <div class="card bg-base-100 shadow-sm">
              <div class="card-body">
                <p class="text-sm text-base-content/50">数据库</p>
                <p class="text-3xl font-black" :class="overview.dbConnected ? 'text-success' : 'text-error'">
                  {{ overview.dbConnected ? "正常" : "断开" }}
                </p>
              </div>
            </div>
            <div class="card bg-base-100 shadow-sm">
              <div class="card-body">
                <p class="text-sm text-base-content/50">总用户 / 总题目</p>
                <p class="text-3xl font-black">{{ overview.userCount }} / {{ overview.problemCount }}</p>
              </div>
            </div>
            <div class="card bg-base-100 shadow-sm">
              <div class="card-body">
                <p class="text-sm text-base-content/50">App Uptime</p>
                <p class="text-2xl font-black">{{ formatUptime(overview.appUptime) }}</p>
              </div>
            </div>
          </div>

          <div class="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)]">
            <div class="card bg-base-100 shadow-sm">
              <div class="card-body">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <h2 class="card-title">30 天趋势</h2>
                  <div class="flex flex-wrap gap-2 text-xs">
                    <span class="badge badge-info badge-sm">活跃</span>
                    <span class="badge badge-primary badge-sm">新题</span>
                    <span class="badge badge-success badge-sm">复习</span>
                    <span class="badge badge-error badge-sm">错误</span>
                  </div>
                </div>
                <div class="overflow-x-auto">
                  <table class="table table-sm">
                    <thead>
                      <tr>
                        <th>日期</th>
                        <th>活跃</th>
                        <th>开始新题</th>
                        <th>复习</th>
                        <th>错误</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in trend" :key="item.date">
                        <td class="font-mono text-xs">{{ item.date.slice(5) }}</td>
                        <td>
                          <div class="flex min-w-28 items-center gap-2">
                            <span class="w-8 text-right font-mono text-xs">{{ item.activeUsers }}</span>
                            <span class="h-2 rounded bg-info" :style="{ width: barWidth(item.activeUsers) }"></span>
                          </div>
                        </td>
                        <td>
                          <div class="flex min-w-28 items-center gap-2">
                            <span class="w-8 text-right font-mono text-xs">{{ item.startedItems }}</span>
                            <span class="h-2 rounded bg-primary" :style="{ width: barWidth(item.startedItems) }"></span>
                          </div>
                        </td>
                        <td>
                          <div class="flex min-w-28 items-center gap-2">
                            <span class="w-8 text-right font-mono text-xs">{{ item.reviews }}</span>
                            <span class="h-2 rounded bg-success" :style="{ width: barWidth(item.reviews) }"></span>
                          </div>
                        </td>
                        <td>
                          <div class="flex min-w-28 items-center gap-2">
                            <span class="w-8 text-right font-mono text-xs">{{ item.errors }}</span>
                            <span class="h-2 rounded bg-error" :style="{ width: barWidth(item.errors) }"></span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div class="card bg-base-100 shadow-sm">
              <div class="card-body">
                <h2 class="card-title">最近错误</h2>
                <div v-if="recentErrors.length === 0" class="py-10 text-center text-base-content/50">暂无错误</div>
                <div v-else class="space-y-3">
                  <div v-for="err in recentErrors" :key="err.id" class="rounded-box border border-base-300 p-3">
                    <div class="flex items-center justify-between gap-3">
                      <p class="truncate text-sm font-bold">{{ err.event }}</p>
                      <span class="badge badge-sm" :class="levelBadge[err.level] || 'badge-neutral'">{{ err.level }}</span>
                    </div>
                    <p class="mt-1 truncate text-sm text-base-content/60">{{ err.message }}</p>
                    <p class="mt-2 font-mono text-xs text-base-content/40">{{ formatDateTime(err.timestamp) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-if="activeTab === 'logs'">
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <div class="flex flex-wrap items-end gap-3">
              <div class="form-control">
                <label class="label pb-1"><span class="label-text text-xs">Level</span></label>
                <select v-model="logFilters.level" class="select select-bordered select-sm">
                  <option value="">全部</option>
                  <option value="error">Error</option>
                  <option value="warn">Warn</option>
                  <option value="info">Info</option>
                  <option value="audit">Audit</option>
                </select>
              </div>
              <div class="form-control">
                <label class="label pb-1"><span class="label-text text-xs">Source</span></label>
                <select v-model="logFilters.source" class="select select-bordered select-sm">
                  <option value="">全部</option>
                  <option value="server">Server</option>
                  <option value="client">Client</option>
                  <option value="system">System</option>
                </select>
              </div>
              <div class="form-control">
                <label class="label pb-1"><span class="label-text text-xs">Event</span></label>
                <input v-model="logFilters.event" type="text" placeholder="事件名" class="input input-bordered input-sm" />
              </div>
              <div class="form-control">
                <label class="label pb-1"><span class="label-text text-xs">Route</span></label>
                <input v-model="logFilters.route" type="text" placeholder="接口路径" class="input input-bordered input-sm" />
              </div>
              <div class="form-control">
                <label class="label pb-1"><span class="label-text text-xs">Status</span></label>
                <input v-model="logFilters.statusCode" type="text" placeholder="状态码" class="input input-bordered input-sm w-24" />
              </div>
              <div class="form-control">
                <label class="label pb-1"><span class="label-text text-xs">Request ID</span></label>
                <input v-model="logFilters.requestId" type="text" placeholder="request id" class="input input-bordered input-sm" />
              </div>
              <div class="form-control">
                <label class="label pb-1"><span class="label-text text-xs">Version</span></label>
                <input v-model="logFilters.appVersion" type="text" placeholder="app version" class="input input-bordered input-sm" />
              </div>
              <div class="form-control">
                <label class="label pb-1"><span class="label-text text-xs">From</span></label>
                <input v-model="logFilters.from" type="datetime-local" class="input input-bordered input-sm" />
              </div>
              <div class="form-control">
                <label class="label pb-1"><span class="label-text text-xs">To</span></label>
                <input v-model="logFilters.to" type="datetime-local" class="input input-bordered input-sm" />
              </div>
              <div class="form-control">
                <label class="label pb-1"><span class="label-text text-xs">Search</span></label>
                <input v-model="logFilters.q" type="text" placeholder="消息 / 路由" class="input input-bordered input-sm" />
              </div>
              <button class="btn btn-primary btn-sm" @click="onLogFilter">搜索</button>
              <button class="btn btn-ghost btn-sm" @click="resetFilters">重置</button>
            </div>

            <div v-if="loadingLogs" class="flex justify-center py-10">
              <span class="loading loading-spinner loading-md text-primary"></span>
            </div>
            <div v-else-if="logEntries.length === 0" class="py-10 text-center text-base-content/50">无匹配日志</div>
            <div v-else class="mt-4 space-y-3">
              <div v-for="entry in logEntries" :key="entry.id" class="rounded-box border border-base-300 p-4">
                <button class="flex w-full cursor-pointer items-center justify-between gap-3 text-left" @click="expandedId = expandedId === entry.id ? null : entry.id">
                  <span class="min-w-0 flex-1">
                    <span class="flex flex-wrap items-center gap-2">
                      <span class="badge badge-sm" :class="levelBadge[entry.level] || 'badge-neutral'">{{ entry.level }}</span>
                      <span class="badge badge-ghost badge-sm">{{ entry.source }}</span>
                      <span class="text-sm font-bold">{{ entry.event }}</span>
                      <span class="font-mono text-xs text-base-content/40">{{ entry.route || "/" }}</span>
                      <span v-if="entry.statusCode" class="text-xs text-base-content/40">{{ entry.statusCode }}</span>
                    </span>
                    <span class="mt-1 block truncate text-sm text-base-content/70">{{ entry.message }}</span>
                  </span>
                  <span class="whitespace-nowrap text-xs text-base-content/40">{{ formatDateTime(entry.timestamp) }}</span>
                </button>

                <div v-if="expandedId === entry.id" class="mt-3 border-t border-base-300 pt-3">
                  <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div class="flex flex-wrap gap-2 text-xs">
                      <span class="badge badge-ghost badge-sm">source: {{ entry.source }}</span>
                      <span v-if="entry.appVersion" class="badge badge-ghost badge-sm">version: {{ entry.appVersion }}</span>
                      <span v-if="entry.environment" class="badge badge-ghost badge-sm">env: {{ entry.environment }}</span>
                    </div>
                    <button class="btn btn-outline btn-xs" @click="copyDiagnostic(entry)">
                      {{ copiedId === entry.id ? "已复制" : "复制诊断信息" }}
                    </button>
                  </div>
                  <div v-if="entry.errorStack" class="mb-2">
                    <p class="mb-1 text-xs font-bold text-base-content/50">Stack Trace</p>
                    <pre class="rounded-box max-h-64 overflow-x-auto overflow-y-auto bg-neutral p-3 text-xs text-neutral-content">{{ entry.errorStack }}</pre>
                  </div>
                  <div class="grid gap-1 text-xs sm:grid-cols-2">
                    <div v-if="entry.errorName"><span class="text-base-content/50">Error: </span>{{ entry.errorName }}</div>
                    <div v-if="entry.errorCause"><span class="text-base-content/50">Cause: </span>{{ entry.errorCause }}</div>
                    <div v-if="entry.requestId"><span class="text-base-content/50">Request ID: </span><span class="font-mono">{{ entry.requestId }}</span></div>
                    <div v-if="entry.userId"><span class="text-base-content/50">User: </span>{{ entry.userId }}</div>
                    <div v-if="entry.method"><span class="text-base-content/50">Method: </span>{{ entry.method }}</div>
                    <div v-if="entry.durationMs"><span class="text-base-content/50">Duration: </span>{{ entry.durationMs }}ms</div>
                    <div v-if="entry.metadata?.operation"><span class="text-base-content/50">Operation: </span>{{ entry.metadata.operation }}</div>
                  </div>
                  <div v-if="entry.metadata && Object.keys(entry.metadata).length > 0" class="mt-2">
                    <p class="mb-1 text-xs font-bold text-base-content/50">Metadata</p>
                    <pre class="rounded-box overflow-x-auto bg-base-200 p-2 text-xs">{{ JSON.stringify(entry.metadata, null, 2) }}</pre>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="totalPages > 1" class="mt-4 flex justify-center">
              <div class="join">
                <button class="join-item btn btn-sm" :disabled="logPage <= 1" @click="logPage--; fetchLogs()">«</button>
                <button class="join-item btn btn-sm">第 {{ logPage }} / {{ totalPages }} 页</button>
                <button class="join-item btn btn-sm" :disabled="logPage >= totalPages" @click="logPage++; fetchLogs()">»</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
