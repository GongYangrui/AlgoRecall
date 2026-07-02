<script setup lang="ts">
import { Loader2 } from "@lucide/vue";
import { authClient } from "../utils/auth-client";

const name = ref("");
const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    const result = await authClient.signUp.email({
      name: name.value,
      email: email.value,
      password: password.value,
    });
    if (result.error) {
      error.value = result.error.message || "注册失败，请稍后再试。";
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
        <p class="mt-2 text-base-content/60">从第一道题开始建立复习节奏</p>
      </div>

      <div v-if="error" class="alert alert-error alert-soft mb-4">{{ error }}</div>

      <fieldset class="fieldset bg-base-100 border-base-300 rounded-box w-full border p-4">
        <legend class="fieldset-legend">创建账号</legend>

        <label class="label" for="signup-name">昵称</label>
        <input id="signup-name" v-model="name" class="input w-full" required type="text" autocomplete="name" placeholder="你的昵称" />

        <label class="label" for="signup-email">邮箱</label>
        <input id="signup-email" v-model="email" class="input w-full" required type="email" autocomplete="email" placeholder="you@example.com" />

        <label class="label" for="signup-password">密码</label>
        <input
          id="signup-password"
          v-model="password"
          class="input w-full"
          minlength="6"
          required
          type="password"
          autocomplete="new-password"
          placeholder="至少 6 位密码"
        />

        <button class="btn btn-primary mt-4 w-full" type="submit" :disabled="loading">
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
          注册并进入
        </button>

        <p class="text-center text-sm text-base-content/60">
          已经有账号？
          <NuxtLink to="/login" class="link link-primary font-semibold">登录</NuxtLink>
        </p>
      </fieldset>
    </form>
  </div>
</template>
