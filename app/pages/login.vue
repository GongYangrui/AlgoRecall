<script setup lang="ts">
import { Loader2 } from "@lucide/vue";
import { authClient } from "../utils/auth-client";

const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    const result = await authClient.signIn.email({
      email: email.value,
      password: password.value,
    });
    if (result.error) {
      error.value = result.error.message || "登录失败，请检查邮箱和密码。";
      return;
    }
    await navigateTo("/app");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth-shell min-h-screen px-4 py-8">
    <div class="auth-stage mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-5xl place-items-center gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(380px,440px)]">
      <section class="auth-insight hidden lg:block" aria-hidden="true">
        <div class="auth-insight-header">
          <p class="font-mono text-xs font-bold uppercase tracking-[0.24em] text-primary/80">Review rhythm</p>
          <h2 class="mt-3 text-4xl font-black leading-tight text-neutral">今天的题，刚好回到记忆边缘。</h2>
        </div>
        <div class="recall-orbit mt-10">
          <span class="recall-node recall-node-primary">12</span>
          <span class="recall-node recall-node-secondary">3rd</span>
          <span class="recall-node recall-node-accent">D+1</span>
        </div>
        <div class="auth-note-grid mt-10">
          <div>
            <p class="font-mono text-3xl font-black text-neutral">07:40</p>
            <p class="mt-1 text-sm text-base-content/55">晨间复盘窗口</p>
          </div>
          <div>
            <p class="font-mono text-3xl font-black text-neutral">84%</p>
            <p class="mt-1 text-sm text-base-content/55">近七天完成率</p>
          </div>
        </div>
      </section>

      <form class="auth-card w-full max-w-md lg:max-w-none" @submit.prevent="submit">
        <div class="mb-5 text-center">
          <NuxtLink to="/" class="text-3xl font-black">AlgoRecall</NuxtLink>
          <p class="mt-2 text-base-content/60">回到今天的复习节奏</p>
        </div>

        <div v-if="error" class="alert alert-error alert-soft mb-4">{{ error }}</div>

        <fieldset class="fieldset auth-form-fieldset w-full">
          <legend class="fieldset-legend">继续复习</legend>

          <label class="label" for="login-email">邮箱</label>
          <input id="login-email" v-model="email" class="input w-full" required type="email" autocomplete="email" placeholder="you@example.com" />

          <label class="label" for="login-password">密码</label>
          <input id="login-password" v-model="password" class="input w-full" required type="password" autocomplete="current-password" placeholder="请输入密码" />

          <button class="btn btn-primary mt-4 w-full" type="submit" :disabled="loading">
            <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
            登录
          </button>

          <p class="text-center text-sm text-base-content/60">
            还没有账号？
            <NuxtLink to="/signup" class="link link-primary font-semibold">注册</NuxtLink>
          </p>
        </fieldset>
      </form>
    </div>
  </div>
</template>
