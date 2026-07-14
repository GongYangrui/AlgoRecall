<script setup lang="ts">
import { Check, Laptop, Loader2, ShieldCheck, X } from "@lucide/vue";

definePageMeta({ middleware: "auth" });

const route = useRoute();
const pairingId = computed(() => typeof route.query.pairing === "string" ? route.query.pairing : "");
const userCode = computed(() => typeof route.query.code === "string" ? route.query.code : "");
const loading = ref<"approve" | "deny" | "">("");
const error = ref("");
const completed = ref<"approved" | "denied" | "">("");
const validRequest = computed(() => Boolean(pairingId.value && /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(userCode.value)));

async function decide(decision: "approve" | "deny") {
  if (!validRequest.value || loading.value) return;
  loading.value = decision;
  error.value = "";
  try {
    const result = await $fetch<{ status: "approved" | "denied" }>(`/api/extension/pairings/${pairingId.value}/decision`, {
      method: "POST",
      body: { decision, userCode: userCode.value },
    });
    completed.value = result.status;
  } catch (cause) {
    const fetchError = cause as { data?: { data?: { code?: string }; statusMessage?: string }; statusMessage?: string };
    const code = fetchError.data?.data?.code;
    error.value = code === "PAIRING_EXPIRED"
      ? "这个连接请求已经过期，请回到扩展重新发起。"
      : fetchError.data?.statusMessage || fetchError.statusMessage || "连接请求处理失败，请稍后重试。";
  } finally {
    loading.value = "";
  }
}
</script>

<template>
  <div class="auth-shell min-h-screen px-4 py-8">
    <main class="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-lg place-items-center">
      <section class="auth-card w-full" aria-labelledby="connect-title">
        <div class="mb-6 flex items-center gap-3">
          <div class="grid size-12 place-items-center rounded-box bg-primary/10 text-primary">
            <Laptop class="size-6" />
          </div>
          <div>
            <p class="font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary">Browser extension</p>
            <h1 id="connect-title" class="mt-1 text-2xl font-black">连接 AlgoRecall 扩展</h1>
          </div>
        </div>

        <div v-if="completed" class="alert" :class="completed === 'approved' ? 'alert-success alert-soft' : 'alert-info alert-soft'">
          <Check v-if="completed === 'approved'" class="size-5" />
          <X v-else class="size-5" />
          <span>{{ completed === "approved" ? "已批准连接，可以关闭此页面并返回 LeetCode。" : "已拒绝这次连接请求。" }}</span>
        </div>

        <template v-else>
          <div v-if="!validRequest" class="alert alert-error alert-soft">
            <span>连接链接不完整，请从扩展重新打开。</span>
          </div>
          <template v-else>
            <div class="rounded-box border border-base-300 bg-base-200/70 p-4 text-center">
              <p class="text-sm text-base-content/60">请确认扩展中显示的验证码</p>
              <p class="mt-2 font-mono text-3xl font-black tracking-[0.16em] text-neutral">{{ userCode }}</p>
            </div>

            <div class="mt-5 flex gap-3 rounded-box border border-base-300 p-4">
              <ShieldCheck class="mt-0.5 size-5 shrink-0 text-primary" />
              <div class="text-sm leading-6 text-base-content/70">
                <p class="font-bold text-base-content">扩展只能查询题目并记录复习</p>
                <p>它不会获得网站 Cookie、密码、编辑器内容或完整账号权限。连接将在 30 天后自动过期，你也可以随时撤销。</p>
              </div>
            </div>

            <div v-if="error" class="alert alert-error alert-soft mt-4"><span>{{ error }}</span></div>
            <div class="mt-6 grid gap-2 sm:grid-cols-2">
              <button class="btn btn-primary" type="button" :disabled="Boolean(loading)" @click="decide('approve')">
                <Loader2 v-if="loading === 'approve'" class="size-4 animate-spin" />
                批准连接
              </button>
              <button class="btn btn-ghost" type="button" :disabled="Boolean(loading)" @click="decide('deny')">
                <Loader2 v-if="loading === 'deny'" class="size-4 animate-spin" />
                拒绝
              </button>
            </div>
          </template>
        </template>

        <div class="mt-6 border-t border-base-300 pt-4 text-center">
          <NuxtLink to="/settings/extensions" class="link link-primary text-sm font-semibold">管理已有扩展连接</NuxtLink>
        </div>
      </section>
    </main>
  </div>
</template>
