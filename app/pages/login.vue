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
  <div class="page-shell grid min-h-screen place-items-center px-4 py-10">
    <form class="w-full max-w-md" @submit.prevent="submit">
      <div class="mb-4 text-center">
        <NuxtLink to="/" class="text-3xl font-black">AlgoRecall</NuxtLink>
        <p class="mt-2 text-base-content/60">回到今天的复习节奏</p>
      </div>

      <div v-if="error" class="alert alert-error alert-soft mb-4">{{ error }}</div>

      <fieldset class="fieldset bg-base-100 border-base-300 rounded-box w-full border p-4">
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
</template>
