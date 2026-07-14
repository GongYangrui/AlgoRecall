<script setup lang="ts">
import { Laptop, Loader2, PlugZap, ShieldOff } from "@lucide/vue";
import type { ExtensionConnection } from "@shared/extension";

definePageMeta({ middleware: "auth" });

const requestFetch = useRequestFetch();
const revoking = ref("");
const actionError = ref("");
const { data, pending, error, refresh } = await useAsyncData("extension-connections", () =>
  requestFetch<{ connections: ExtensionConnection[] }>("/api/extension/connections"));

const connections = computed(() => data.value?.connections || []);

function formatDate(value: string | null) {
  if (!value) return "尚未使用";
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function connectionStatus(item: ExtensionConnection) {
  if (item.revokedAt) return "已撤销";
  if (Date.parse(item.expiresAt) <= Date.now()) return "已过期";
  return "已连接";
}

async function revoke(id: string) {
  if (revoking.value) return;
  revoking.value = id;
  actionError.value = "";
  try {
    await $fetch(`/api/extension/connections/${id}`, { method: "DELETE", body: {} });
    await refresh();
  } catch {
    actionError.value = "撤销失败，请稍后重试。";
  } finally {
    revoking.value = "";
  }
}
</script>

<template>
  <AppFrame>
    <div class="mx-auto max-w-4xl">
      <div class="mb-6 flex items-start gap-4">
        <div class="grid size-12 shrink-0 place-items-center rounded-box bg-primary/10 text-primary"><PlugZap class="size-6" /></div>
        <div>
          <h1 class="text-3xl font-black">浏览器扩展</h1>
          <p class="mt-2 text-base-content/65">查看连接状态，或立即撤销不再使用的设备。</p>
        </div>
      </div>

      <div v-if="actionError" class="alert alert-error alert-soft mb-4"><span>{{ actionError }}</span></div>
      <div v-if="pending" class="grid gap-3">
        <div v-for="index in 2" :key="index" class="skeleton h-36 w-full" />
      </div>
      <div v-else-if="error" class="alert alert-error alert-soft"><span>连接列表加载失败，请刷新页面重试。</span></div>
      <div v-else-if="connections.length === 0" class="card border border-base-300 bg-base-100 shadow-sm">
        <div class="card-body items-center py-14 text-center">
          <Laptop class="size-10 text-base-content/35" />
          <h2 class="card-title mt-2">还没有扩展连接</h2>
          <p class="text-base-content/60">在 Chrome 开发者模式加载扩展后，从 LeetCode 题目页发起连接。</p>
        </div>
      </div>
      <ul v-else class="list gap-3">
        <li v-for="item in connections" :key="item.id" class="list-row border border-base-300 bg-base-100 shadow-sm">
          <div class="grid size-10 place-items-center rounded-box bg-base-200"><Laptop class="size-5" /></div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-bold">{{ item.deviceName }}</span>
              <span class="badge badge-sm" :class="connectionStatus(item) === '已连接' ? 'badge-success badge-soft' : 'badge-ghost'">{{ connectionStatus(item) }}</span>
            </div>
            <dl class="mt-2 grid gap-x-6 gap-y-1 text-xs text-base-content/60 sm:grid-cols-2">
              <div><dt class="inline font-semibold">创建：</dt><dd class="inline">{{ formatDate(item.createdAt) }}</dd></div>
              <div><dt class="inline font-semibold">最近使用：</dt><dd class="inline">{{ formatDate(item.lastUsedAt) }}</dd></div>
              <div><dt class="inline font-semibold">到期：</dt><dd class="inline">{{ formatDate(item.expiresAt) }}</dd></div>
            </dl>
          </div>
          <button
            class="btn btn-ghost btn-sm text-error"
            type="button"
            :disabled="Boolean(item.revokedAt) || connectionStatus(item) === '已过期' || Boolean(revoking)"
            @click="revoke(item.id)"
          >
            <Loader2 v-if="revoking === item.id" class="size-4 animate-spin" />
            <ShieldOff v-else class="size-4" />
            撤销
          </button>
        </li>
      </ul>
    </div>
  </AppFrame>
</template>
