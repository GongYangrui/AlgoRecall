// @ts-nocheck - Nuxt 4 type checker stack depth issue with route matching
<script setup lang="ts">
import { ArrowRight, CalendarClock, LineChart, Search } from "@lucide/vue";
const session = ref<{ user?: { role?: string } }>({});
const requestFetch = useRequestFetch();
try {
  const result = await useAsyncData("home-session", () =>
    requestFetch<{ user?: { role?: string } }>("/api/auth/get-session"),
  );
  session.value = result.data.value || {};
} catch {
  session.value = {};
}
</script>

<template>
  <div class="page-shell recall-field">
    <div class="content-wrap min-h-screen py-5">
      <div class="navbar px-0">
        <div class="navbar-start">
          <NuxtLink to="/" class="btn btn-ghost px-0 text-xl font-black">AlgoRecall</NuxtLink>
        </div>
        <div class="navbar-end gap-2">
          <NuxtLink v-if="session.user?.role === 'admin'" to="/admin" class="btn btn-ghost">管理后台</NuxtLink>
          <NuxtLink to="/login" class="btn btn-ghost">登录</NuxtLink>
          <NuxtLink to="/signup" class="btn btn-primary">开始使用</NuxtLink>
        </div>
      </div>

      <section class="landing-hero grid min-h-[calc(100vh-96px)] items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div class="landing-copy max-w-3xl">
          <div class="badge badge-primary badge-soft mb-5">LeetCode 复习台</div>
          <h1 class="text-5xl font-black leading-[1.04] tracking-normal text-neutral md:text-7xl">
            把刷过的题，安排成每天刚好的复习量。
          </h1>
          <p class="mt-6 max-w-2xl text-lg leading-8 text-base-content/70">
            AlgoRecall 用本地 LeetCode 题库、间隔复习和掌握度统计，帮你把零散刷题变成稳定的复盘节奏。
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <NuxtLink to="/signup" class="btn btn-primary btn-lg">
              创建账号
              <ArrowRight class="h-5 w-5" />
            </NuxtLink>
            <NuxtLink to="/login" class="btn btn-outline btn-lg">继续复习</NuxtLink>
          </div>
        </div>

        <div class="aura aura-rainbow aura-sm hero-preview-aura landing-preview w-full duration-2000">
          <div class="soft-panel rounded-box w-full p-4">
            <div class="rounded-box bg-base-100 p-5">
              <div class="mb-5 flex items-center justify-between">
                <div>
                  <p class="text-sm font-semibold text-base-content/50">今日队列</p>
                  <h2 class="text-2xl font-black">12 道待复习</h2>
                </div>
                <div class="radial-progress text-primary" style="--value:72; --size:5rem; --thickness:0.55rem">72%</div>
              </div>
              <div class="space-y-3">
                <div class="rounded-box border border-base-300 bg-base-100 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="font-bold">#1 两数之和</p>
                      <p class="text-sm text-base-content/60">数组 · 哈希表 · 第 3 轮</p>
                    </div>
                    <span class="badge badge-success badge-soft">简单</span>
                  </div>
                  <progress class="progress progress-primary mt-4" value="45" max="100" />
                </div>
                <div class="rounded-box border border-base-300 bg-base-100 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="font-bold">#42 接雨水</p>
                      <p class="text-sm text-base-content/60">单调栈 · 双指针 · 明天复习</p>
                    </div>
                    <span class="badge badge-error badge-soft">困难</span>
                  </div>
                  <progress class="progress progress-warning mt-4" value="26" max="100" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="grid gap-4 pb-10 md:grid-cols-3">
        <div class="hover-3d w-full">
          <div class="card h-full bg-base-100 shadow-sm">
            <div class="card-body">
              <CalendarClock class="h-7 w-7 text-primary" />
              <h2 class="card-title">自动排期</h2>
              <p class="text-base-content/65">按解题反馈推进下一次复习，不靠手动记日期。</p>
            </div>
          </div>
        </div>
        <div class="hover-3d w-full">
          <div class="card h-full bg-base-100 shadow-sm">
            <div class="card-body">
              <Search class="h-7 w-7 text-primary" />
              <h2 class="card-title">本地题库</h2>
              <p class="text-base-content/65">搜索题号、标题和标签，从 LeetCode 索引快速加入。</p>
            </div>
          </div>
        </div>
        <div class="hover-3d w-full">
          <div class="card h-full bg-base-100 shadow-sm">
            <div class="card-body">
              <LineChart class="h-7 w-7 text-primary" />
              <h2 class="card-title">掌握度统计</h2>
              <p class="text-base-content/65">看清薄弱题、复习分布和已掌握比例。</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
