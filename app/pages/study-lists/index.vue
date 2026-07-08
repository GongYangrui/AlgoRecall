<script setup lang="ts">
import { ExternalLink } from "@lucide/vue";
import type { StudyListSummary } from "@shared/types";

definePageMeta({ middleware: "auth" });

const requestFetch = useRequestFetch();
const { data, pending } = await useAsyncData("study-lists", () => requestFetch<StudyListSummary[]>("/api/study-lists"));
</script>

<template>
  <AppFrame>
    <div class="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
      <div>
        <div class="badge badge-primary badge-soft mb-3">Study Lists</div>
        <h1 class="text-3xl font-black md:text-4xl">精选题单</h1>
        <p class="mt-2 text-base-content/65">先查看题单内容，设置每日加入数量后再加入复习队列。</p>
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
              <div class="text-xs text-base-content/55">已入队</div>
              <div class="metric-number text-2xl font-black">{{ list.completed }}</div>
            </div>
            <div class="rounded-box bg-base-200 p-3">
              <div class="text-xs text-base-content/55">入队率</div>
              <div class="metric-number text-2xl font-black text-primary">{{ list.percent }}%</div>
            </div>
          </div>

          <progress class="progress progress-primary mt-2" :value="list.completed" :max="list.total" />

          <div class="card-actions mt-4 justify-end">
            <NuxtLink class="btn btn-outline transition duration-150 ease-out active:scale-[0.98]" :to="`/study-lists/${list.slug}`">{{ list.enrolled ? "查看题单" : "查看并设置" }}</NuxtLink>
          </div>
        </div>
      </section>
    </div>
  </AppFrame>
</template>
