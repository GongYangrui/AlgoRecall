<script setup lang="ts">
import type { AdminOverview, AdminLogEntry } from "@shared/types/admin";

definePageMeta({ middleware: "admin" });

const activeTab = ref<"overview" | "logs">("overview");
const loading = ref(false);

// Overview
const overview = ref<AdminOverview | null>(null);
const recentErrors = ref<AdminLogEntry[]>([]);

// Logs
const logEntries = ref<AdminLogEntry[]>([]);
const logTotal = ref(0);
const logPage = ref(1);
const logPageSize = ref(20);
const logFilters = reactive({
  level: "",
  event: "",
  route: "",
  statusCode: "",
  requestId: "",
  from: "",
  to: "",
  q: "",
});
const expandedId = ref<string | null>(null);

async function fetchOverview() {
  loading.value = true;
  try {
    const data = await $fetch<AdminOverview>("/api/admin/overview");
    overview.value = data;
    const logs = await $fetch<{ items: AdminLogEntry[] }>("/api/admin/logs?level=error&pageSize=10");
    recentErrors.value = logs.items;
  } catch {
    // handled by Nuxt error page
  } finally {
    loading.value = false;
  }
}

async function fetchLogs() {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    params.set("page", String(logPage.value));
    params.set("pageSize", String(logPageSize.value));
    if (logFilters.level) params.set("level", logFilters.level);
    if (logFilters.event) params.set("event", logFilters.event);
    if (logFilters.route) params.set("route", logFilters.route);
    if (logFilters.statusCode) params.set("statusCode", logFilters.statusCode);
    if (logFilters.requestId) params.set("requestId", logFilters.requestId);
    if (logFilters.from) params.set("from", logFilters.from);
    if (logFilters.to) params.set("to", logFilters.to);
    if (logFilters.q) params.set("q", logFilters.q);

    const data = await $fetch<{ items: AdminLogEntry[]; total: number }>(`/api/admin/logs?${params.toString()}`);
    logEntries.value = data.items;
    logTotal.value = data.total;
  } catch {
    // handled by Nuxt error page
  } finally {
    loading.value = false;
  }
}

function onTabChange(tab: "overview" | "logs") {
  activeTab.value = tab;
  if (tab === "logs") fetchLogs();
}

function onLogFilter() {
  logPage.value = 1;
  fetchLogs();
}

function resetFilters() {
  logFilters.level = "";
  logFilters.event = "";
  logFilters.route = "";
  logFilters.statusCode = "";
  logFilters.requestId = "";
  logFilters.from = "";
  logFilters.to = "";
  logFilters.q = "";
  logPage.value = 1;
  fetchLogs();
}

onMounted(() => {
  fetchOverview();
});

const statusColor = (ok: boolean) => (ok ? "text-success" : "text-error");
const levelBadge: Record<string, string> = {
  error: "badge-error",
  warn: "badge-warning",
  info: "badge-info",
  audit: "badge-neutral",
};

const totalPages = computed(() => Math.max(1, Math.ceil(logTotal.value / logPageSize.value)));
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

    <div class="content-wrap pb-10">
      <div class="tabs tabs-boxed mb-6 inline-flex">
        <button class="tab" :class="{ 'tab-active': activeTab === 'overview' }" @click="onTabChange('overview')">
          错误总览
        </button>
        <button class="tab" :class="{ 'tab-active': activeTab === 'logs' }" @click="onTabChange('logs')">
          错误日志
        </button>
      </div>

      <!-- Overview Tab -->
      <div v-if="activeTab === 'overview'">
        <div v-if="loading" class="flex justify-center py-20">
          <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>
        <div v-else-if="overview">
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="card bg-base-100 shadow-sm">
              <div class="card-body">
                <p class="text-sm text-base-content/50">用户数</p>
                <p class="text-3xl font-black">{{ overview.userCount }}</p>
              </div>
            </div>
            <div class="card bg-base-100 shadow-sm">
              <div class="card-body">
                <p class="text-sm text-base-content/50">题目数</p>
                <p class="text-3xl font-black">{{ overview.problemCount }}</p>
              </div>
            </div>
            <div class="card bg-base-100 shadow-sm">
              <div class="card-body">
                <p class="text-sm text-base-content/50">复习数</p>
                <p class="text-3xl font-black">{{ overview.reviewCount }}</p>
              </div>
            </div>
            <div class="card bg-base-100 shadow-sm">
              <div class="card-body">
                <p class="text-sm text-base-content/50">24h 活跃用户</p>
                <p class="text-3xl font-black">{{ overview.activeUsers24h }}</p>
              </div>
            </div>
          </div>

          <div class="mt-6 grid gap-4 sm:grid-cols-2">
            <div class="card bg-base-100 shadow-sm">
              <div class="card-body">
                <p class="text-sm text-base-content/50">24h 错误数</p>
                <p class="text-3xl font-black" :class="statusColor(overview.errorCount24h === 0)">
                  {{ overview.errorCount24h }}
                </p>
              </div>
            </div>
            <div class="card bg-base-100 shadow-sm">
              <div class="card-body">
                <p class="text-sm text-base-content/50">数据库</p>
                <p class="text-3xl font-black" :class="statusColor(overview.dbConnected)">
                  {{ overview.dbConnected ? "正常" : "断开" }}
                </p>
              </div>
            </div>
          </div>

          <div class="mt-6 card bg-base-100 shadow-sm">
            <div class="card-body">
              <p class="text-sm text-base-content/50 mb-2">App Uptime</p>
              <p class="text-2xl font-black font-mono">{{ Math.floor(overview.appUptime / 60) }} 分 {{ overview.appUptime % 60 }} 秒</p>
            </div>
          </div>

          <div class="mt-6 card bg-base-100 shadow-sm">
            <div class="card-body">
              <h2 class="card-title">最近错误</h2>
              <div v-if="recentErrors.length === 0" class="text-base-content/50 py-4 text-center">
                暂无错误
              </div>
              <div v-else class="space-y-3">
                <div v-for="err in recentErrors" :key="err.id" class="rounded-box border border-base-300 bg-base-100 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0">
                      <p class="font-bold truncate">{{ err.event }}</p>
                      <p class="text-sm text-base-content/60 truncate">{{ err.message }}</p>
                    </div>
                    <span class="badge" :class="levelBadge[err.level] || 'badge-neutral'">{{ err.level }}</span>
                  </div>
                  <p class="mt-2 text-xs text-base-content/40 font-mono">{{ new Date(err.timestamp).toLocaleString("zh-CN") }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Logs Tab -->
      <div v-if="activeTab === 'logs'">
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
                <label class="label pb-1"><span class="label-text text-xs">From</span></label>
                <input v-model="logFilters.from" type="datetime-local" class="input input-bordered input-sm" />
              </div>
              <div class="form-control">
                <label class="label pb-1"><span class="label-text text-xs">To</span></label>
                <input v-model="logFilters.to" type="datetime-local" class="input input-bordered input-sm" />
              </div>
              <button class="btn btn-primary btn-sm" @click="onLogFilter">搜索</button>
              <button class="btn btn-ghost btn-sm" @click="resetFilters">重置</button>
            </div>

            <div v-if="loading" class="flex justify-center py-10">
              <span class="loading loading-spinner loading-md text-primary"></span>
            </div>
            <div v-else-if="logEntries.length === 0" class="text-base-content/50 py-10 text-center">
              无匹配日志
            </div>
            <div v-else class="mt-4 space-y-3">
              <div v-for="entry in logEntries" :key="entry.id" class="rounded-box border border-base-300 bg-base-100 p-4">
                <div class="flex items-center justify-between gap-3 cursor-pointer" @click="expandedId = expandedId === entry.id ? null : entry.id">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="badge badge-sm" :class="levelBadge[entry.level] || 'badge-neutral'">{{ entry.level }}</span>
                      <span class="font-bold text-sm">{{ entry.event }}</span>
                      <span class="text-xs text-base-content/40 font-mono">{{ entry.route || "/" }}</span>
                      <span v-if="entry.statusCode" class="text-xs text-base-content/40">{{ entry.statusCode }}</span>
                    </div>
                    <p class="mt-1 text-sm text-base-content/70 truncate">{{ entry.message }}</p>
                  </div>
                  <span class="text-xs text-base-content/40 whitespace-nowrap">{{ new Date(entry.timestamp).toLocaleString("zh-CN") }}</span>
                </div>
                <div v-if="expandedId === entry.id" class="mt-3 border-t border-base-300 pt-3">
                  <div v-if="entry.errorStack" class="mb-2">
                    <p class="text-xs font-bold text-base-content/50 mb-1">Stack Trace</p>
                    <pre class="rounded-box bg-neutral text-neutral-content p-3 text-xs overflow-x-auto max-h-64 overflow-y-auto">{{ entry.errorStack }}</pre>
                  </div>
                  <div class="grid gap-1 text-xs sm:grid-cols-2">
                    <div v-if="entry.errorName"><span class="text-base-content/50">Error: </span>{{ entry.errorName }}</div>
                    <div v-if="entry.errorCause"><span class="text-base-content/50">Cause: </span>{{ entry.errorCause }}</div>
                    <div v-if="entry.requestId"><span class="text-base-content/50">Request ID: </span><span class="font-mono">{{ entry.requestId }}</span></div>
                    <div v-if="entry.userId"><span class="text-base-content/50">User: </span>{{ entry.userId }}</div>
                    <div v-if="entry.method"><span class="text-base-content/50">Method: </span>{{ entry.method }}</div>
                    <div v-if="entry.durationMs"><span class="text-base-content/50">Duration: </span>{{ entry.durationMs }}ms</div>
                  </div>
                  <div v-if="entry.metadata && Object.keys(entry.metadata).length > 0" class="mt-2">
                    <p class="text-xs font-bold text-base-content/50 mb-1">Metadata</p>
                    <pre class="rounded-box bg-base-200 p-2 text-xs overflow-x-auto">{{ JSON.stringify(entry.metadata, null, 2) }}</pre>
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
      </div>
    </div>
  </div>
</template>
