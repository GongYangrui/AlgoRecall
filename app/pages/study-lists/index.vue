<script setup lang="ts">
import { ExternalLink, Loader2 } from "@lucide/vue";
import type { StudyListSummary } from "@shared/types";

definePageMeta({ middleware: "auth" });

const requestFetch = useRequestFetch();
const starting = ref("");
const { data, pending, refresh } = await useAsyncData("study-lists", () => requestFetch<StudyListSummary[]>("/api/study-lists"));

async function startList(slug: string) {
  if (starting.value) return;
  starting.value = slug;
  try {
    await $fetch(`/api/study-lists/${slug}/start`, {
      method: "POST",
      body: { dailyNewCount: 2, mode: "follow_existing" },
    });
    await refresh();
  } finally {
    starting.value = "";
  }
}
</script>

<template>
  <AppFrame>
    <div class="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
      <div>
        <div class="badge badge-primary badge-soft mb-3">Study Lists</div>
        <h1 class="text-3xl font-black md:text-4xl">精选题单</h1>
        <p class="mt-2 text-base-content/65">选择一套题单，按顺序引入新题；复习仍进入同一套全局计划。</p>
      </div>
      <NuxtLink to="/app" class="btn btn-outline">今日学习</NuxtLink>
    </div>

    <div v-if="pending" class="grid min-h-80 place-items-center">
      <span class="loading loading-spinner loading-lg text-primary" />
    </div>

    <div v-else class="grid gap-4 lg:grid-cols-2">
      <section v-for="list in data || []" :key="list.slug" class="card bg-base-100 shadow-sm">
        <div class="card-body">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="mb-3 flex flex-wrap gap-2">
                <span class="badge badge-primary badge-soft">{{ list.locale === "cn" ? "中文站" : "英文站" }}</span>
                <span v-if="list.enrolled" class="badge badge-success badge-soft">已加入</span>
              </div>
              <h2 class="card-title text-2xl">{{ list.title }}</h2>
              <p class="mt-2 text-sm text-base-content/65">{{ list.description }}</p>
            </div>
            <a class="btn btn-ghost btn-sm btn-circle" :href="list.sourceUrl" target="_blank" rel="noreferrer" aria-label="打开原题单">
              <ExternalLink class="h-4 w-4" />
            </a>
          </div>

          <div class="mt-4 grid gap-3 sm:grid-cols-3">
            <div class="rounded-box bg-base-200 p-3">
              <div class="text-xs text-base-content/55">题目数</div>
              <div class="metric-number text-2xl font-black">{{ list.total }}</div>
            </div>
            <div class="rounded-box bg-base-200 p-3">
              <div class="text-xs text-base-content/55">已覆盖</div>
              <div class="metric-number text-2xl font-black">{{ list.completed }}</div>
            </div>
            <div class="rounded-box bg-base-200 p-3">
              <div class="text-xs text-base-content/55">完成率</div>
              <div class="metric-number text-2xl font-black text-primary">{{ list.percent }}%</div>
            </div>
          </div>

          <progress class="progress progress-primary mt-2" :value="list.completed" :max="list.total" />

          <div class="card-actions mt-4 justify-end">
            <NuxtLink class="btn btn-outline transition duration-150 ease-out active:scale-[0.98]" :to="`/study-lists/${list.slug}`">查看题单</NuxtLink>
            <button
              v-if="!list.enrolled"
              class="btn btn-primary transition duration-150 ease-out active:scale-[0.98]"
              type="button"
              :disabled="Boolean(starting)"
              @click="startList(list.slug)"
            >
              <Loader2 v-if="starting === list.slug" class="h-4 w-4 animate-spin" />
              开始学习
            </button>
          </div>
        </div>
      </section>
    </div>
  </AppFrame>
</template>
