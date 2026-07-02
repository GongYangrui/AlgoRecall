<script setup lang="ts">
import { Search } from "@lucide/vue";
import { displayProblemNumber, displayProblemTags, displayProblemTitle } from "@shared/problems";
import type { PaginatedResponse, Problem } from "@shared/types";

definePageMeta({ middleware: "auth" });

const q = ref("");
const difficulty = ref("");
const status = ref("");
const requestFetch = useRequestFetch();
const page = ref(1);
const jumpPage = ref("1");
const pageSize = 20;
const problemQuery = computed(() => ({
  q: q.value || undefined,
  difficulty: difficulty.value || undefined,
  status: status.value || undefined,
  page: page.value,
  pageSize,
}));

const { data, pending, refresh } = await useAsyncData(
  "problems",
  () =>
    requestFetch<PaginatedResponse<Problem>>("/api/problems", {
      query: problemQuery.value,
    }),
  { watch: [problemQuery] },
);

const totalPages = computed(() => Math.max(1, Math.ceil((data.value?.total || 0) / pageSize)));
const currentStart = computed(() => (data.value?.total ? (page.value - 1) * pageSize + 1 : 0));
const currentEnd = computed(() => Math.min(page.value * pageSize, data.value?.total || 0));
const visiblePages = computed(() => {
  const total = totalPages.value;
  const current = page.value;
  const start = Math.max(1, Math.min(current - 2, total - 4));
  const end = Math.min(total, start + 4);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
});

watch([q, difficulty, status], () => {
  page.value = 1;
});

watch(page, (value) => {
  jumpPage.value = String(value);
});

function fullProblemTitle(problem: Problem) {
  const chineseTitle = displayProblemTitle(problem);
  return chineseTitle === problem.title ? chineseTitle : `${chineseTitle} / ${problem.title}`;
}

function previousPage() {
  page.value = Math.max(1, page.value - 1);
}

function nextPage() {
  page.value = Math.min(totalPages.value, page.value + 1);
}

function goToPage(targetPage: number) {
  if (!Number.isFinite(targetPage)) {
    return;
  }

  page.value = Math.min(totalPages.value, Math.max(1, Math.trunc(targetPage)));
}

function jumpToPage() {
  const targetPage = Number(jumpPage.value);

  if (!Number.isFinite(targetPage)) {
    jumpPage.value = String(page.value);
    return;
  }

  goToPage(targetPage);
}
</script>

<template>
  <AppFrame>
    <div class="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
      <div>
        <div class="badge badge-primary badge-soft mb-3">Library</div>
        <h1 class="text-3xl font-black md:text-4xl">题库</h1>
        <p class="mt-2 text-base-content/65">搜索、筛选和导入你要长期复习的题。</p>
      </div>
      <div class="stats bg-base-100 shadow-sm transition duration-150 ease-out hover:-translate-y-0.5">
        <div class="stat py-3">
          <div class="stat-title">当前结果</div>
          <div class="stat-value metric-number text-primary">{{ data?.total || 0 }}</div>
        </div>
      </div>
    </div>

    <section class="card bg-base-100 shadow-sm">
      <div class="card-body gap-4">
        <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_160px]">
          <label class="input input-bordered flex items-center gap-2">
            <Search class="h-4 w-4 text-base-content/45" />
            <input v-model="q" type="search" class="grow" placeholder="题号、标题、标签" />
          </label>
          <select v-model="difficulty" class="select select-bordered">
            <option value="">全部难度</option>
            <option value="easy">简单</option>
            <option value="medium">中等</option>
            <option value="hard">困难</option>
          </select>
          <select v-model="status" class="select select-bordered">
            <option value="">全部状态</option>
            <option value="new">新题</option>
            <option value="learning">学习中</option>
            <option value="reviewing">复习中</option>
            <option value="mastered">已掌握</option>
          </select>
        </div>

        <div v-auto-animate>
          <div v-if="pending" class="grid min-h-80 place-items-center">
            <span class="loading loading-spinner loading-lg text-primary" />
          </div>
          <div v-else-if="!data?.items.length" class="rounded-box border border-dashed border-base-300 p-10 text-center">
            <h2 class="text-xl font-black">没有匹配题目</h2>
            <p class="mt-2 text-base-content/60">换个关键词，或从右侧 LeetCode 索引导入。</p>
          </div>
          <div v-else>
          <div class="overflow-x-auto">
            <table class="table table-zebra table-sm min-w-[900px] table-fixed">
              <colgroup>
                <col class="w-[44%]" />
                <col class="w-[22%]" />
                <col class="w-[20%]" />
                <col class="w-[14%]" />
              </colgroup>
              <thead>
                <tr>
                  <th>题目</th>
                  <th>状态</th>
                  <th>下次复习</th>
                  <th></th>
                </tr>
              </thead>
              <tbody v-auto-animate>
                <tr v-for="problem in data.items" :key="problem.id" class="transition duration-150 ease-out">
                  <td>
                    <div class="flex min-w-0 items-center gap-3">
                      <div
                        class="grid h-12 w-12 shrink-0 place-items-center rounded-box border border-base-300 bg-base-200 font-mono text-sm font-bold text-base-content/70"
                        aria-hidden="true"
                      >
                        {{ displayProblemNumber(problem) }}
                      </div>
                      <div class="min-w-0 flex-1">
                        <NuxtLink class="block truncate font-bold leading-6 transition duration-150 ease-out hover:link" :to="`/problems/${problem.id}`" :title="fullProblemTitle(problem)">
                          {{ displayProblemTitle(problem) }}
                        </NuxtLink>
                        <div class="truncate text-sm text-base-content/55" :title="problem.title">
                          {{ problem.title }}
                        </div>
                        <div class="mt-1 flex min-w-0 flex-wrap gap-1">
                          <span v-for="tag in displayProblemTags(problem).slice(0, 4)" :key="tag" class="badge badge-ghost badge-sm">
                            {{ tag }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="align-middle"><ProblemBadges :difficulty="problem.difficulty" :status="problem.status" /></td>
                  <td class="align-middle text-sm text-base-content/60">{{ problem.nextReviewAt || "无需排期" }}</td>
                  <th class="text-center align-middle">
                    <NuxtLink class="btn btn-ghost btn-xs transition duration-150 ease-out active:scale-[0.96]" :to="`/problems/${problem.id}`">查看</NuxtLink>
                  </th>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-auto-animate class="mt-4 flex flex-col items-center justify-between gap-3 lg:flex-row">
            <p class="text-sm text-base-content/60">显示 {{ currentStart }}-{{ currentEnd }} / 共 {{ data.total }} 题</p>
            <div class="flex flex-col items-center gap-2 sm:flex-row">
              <div class="join">
                <button class="btn join-item btn-sm transition duration-150 ease-out active:scale-[0.98]" type="button" :disabled="page <= 1 || pending" @click="previousPage">上一页</button>
                <button
                  v-for="pageNumber in visiblePages"
                  :key="pageNumber"
                  class="btn join-item btn-sm transition duration-150 ease-out active:scale-[0.98]"
                  :class="pageNumber === page ? 'btn-primary' : 'btn-ghost'"
                  type="button"
                  :disabled="pending"
                  @click="goToPage(pageNumber)"
                >
                  {{ pageNumber }}
                </button>
                <button class="btn join-item btn-sm transition duration-150 ease-out active:scale-[0.98]" type="button" :disabled="page >= totalPages || pending" @click="nextPage">下一页</button>
              </div>

              <form class="join" @submit.prevent="jumpToPage">
                <label class="join-item input input-sm input-bordered w-28">
                  <span class="text-xs text-base-content/50">跳到</span>
                  <input
                    v-model="jumpPage"
                    class="w-10 text-center"
                    type="number"
                    inputmode="numeric"
                    min="1"
                    :max="totalPages"
                    :disabled="pending"
                    aria-label="跳转页码"
                    @blur="jumpToPage"
                  />
                </label>
                <button class="btn join-item btn-sm transition duration-150 ease-out active:scale-[0.98]" type="submit" :disabled="pending">跳转</button>
              </form>
            </div>
          </div>
          </div>
        </div>
      </div>
    </section>
  </AppFrame>
</template>
