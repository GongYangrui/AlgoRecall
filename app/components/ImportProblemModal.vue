<script setup lang="ts">
import { Check, Loader2, Plus, Search, X } from "@lucide/vue";
import { displayProblemTags } from "@shared/problems";
import type { LeetcodeQuestion, LeetcodeSearchResult, Problem } from "@shared/types";

const dialogRef = ref<HTMLDialogElement | null>(null);
const importQuery = ref("");
const importLoading = ref(false);
const importing = ref<Record<string, boolean>>({});
const importError = ref("");
const importSuccess = ref("");
const searched = ref(false);
const results = ref<LeetcodeSearchResult[]>([]);

defineExpose({
  open: () => dialogRef.value?.showModal(),
});

async function searchLeetcode() {
  searched.value = true;
  importError.value = "";
  importSuccess.value = "";
  if (!importQuery.value.trim()) {
    results.value = [];
    return;
  }
  importLoading.value = true;
  try {
    results.value = await $fetch<LeetcodeSearchResult[]>("/api/leetcode/search", {
      query: { q: importQuery.value },
    });
  } finally {
    importLoading.value = false;
  }
}

function setQuestionImporting(questionFrontendId: string, value: boolean) {
  importing.value = {
    ...importing.value,
    [questionFrontendId]: value,
  };
}

function isQuestionImporting(questionFrontendId: string) {
  return Boolean(importing.value[questionFrontendId]);
}

function markQuestionImported(questionFrontendId: string, problemId: string | null) {
  results.value = results.value.map((item) =>
    item.questionFrontendId === questionFrontendId
      ? {
          ...item,
          imported: true,
          problemId,
        }
      : item,
  );
}

async function importQuestion(question: LeetcodeSearchResult) {
  if (question.imported || isQuestionImporting(question.questionFrontendId)) return;

  setQuestionImporting(question.questionFrontendId, true);
  importError.value = "";
  importSuccess.value = "";
  try {
    const problem = await $fetch<Problem>("/api/problems", {
      method: "POST",
      timeout: 10000,
      body: {
        title: question.title,
        titleCn: question.titleCn,
        frontendId: question.questionFrontendId,
        url: question.urlCn || question.urlEn,
        urlEn: question.urlEn,
        urlCn: question.urlCn,
        difficulty: question.difficulty,
        tags: question.tags,
        tagsCn: question.tagsCn,
      },
    });
    markQuestionImported(question.questionFrontendId, problem.id);
    importSuccess.value = `已加入：${displayQuestionTitle(question)}`;
    void refreshNuxtData(["problems", "today-problems", "stats-summary"]).catch((error) => {
      console.error("Failed to refresh problem data after import", error);
    });
  } catch (error) {
    const fetchError = error as { name?: string; statusCode?: number; statusMessage?: string; data?: { statusMessage?: string; data?: { problem?: Problem } } };
    if (fetchError.statusCode === 409 || fetchError.statusMessage === "already_exists" || fetchError.data?.statusMessage === "already_exists") {
      markQuestionImported(question.questionFrontendId, fetchError.data?.data?.problem?.id ?? null);
      importSuccess.value = `题库里已经有：${displayQuestionTitle(question)}`;
      return;
    }

    importError.value =
      fetchError.name === "FetchError" && !fetchError.statusCode
        ? "导入请求超时或服务端没有响应，请重启开发服务后再试。"
        : fetchError.data?.statusMessage || fetchError.statusMessage || "导入失败，请稍后再试。";
  } finally {
    setQuestionImporting(question.questionFrontendId, false);
  }
}

function displayQuestionTitle(question: LeetcodeQuestion) {
  return question.titleCn || question.title;
}

function fullQuestionTitle(question: LeetcodeQuestion) {
  const chineseTitle = displayQuestionTitle(question);
  return chineseTitle === question.title ? chineseTitle : `${chineseTitle} / ${question.title}`;
}
</script>

<template>
  <dialog ref="dialogRef" class="modal modal-bottom sm:modal-middle" tabindex="0">
    <div class="modal-box flex max-h-[85vh] w-11/12 max-w-5xl flex-col p-0">
      <div class="flex items-start justify-between gap-4 border-b border-base-300 px-6 py-5">
        <div>
          <p class="badge badge-primary badge-soft mb-3">Import</p>
          <h2 class="text-2xl font-black md:text-3xl">导入 LeetCode 题目</h2>
          <p class="mt-2 text-sm text-base-content/60">搜索题号、英文标题、中文标题或标签，把题目加入你的长期复习库。</p>
        </div>
        <form method="dialog">
          <button class="btn btn-ghost btn-circle" type="submit" aria-label="关闭导入题目弹层">
            <X class="h-5 w-5" />
          </button>
        </form>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-5">
        <form class="join w-full" @submit.prevent="searchLeetcode">
          <label class="input input-bordered join-item flex flex-1 items-center gap-2">
            <Search class="h-4 w-4 text-base-content/45" />
            <input v-model="importQuery" type="search" class="grow" placeholder="1、两数之和、reverse integer、滑动窗口" />
          </label>
          <button class="btn btn-primary join-item min-w-24 transition duration-150 ease-out active:scale-[0.98]" type="submit" :disabled="importLoading">
            <Loader2 v-if="importLoading" class="h-4 w-4 animate-spin" />
            搜索
          </button>
        </form>

        <div v-auto-animate>
          <div v-if="importError" class="alert alert-error alert-soft mt-4">
            <span>{{ importError }}</span>
          </div>

          <div v-else-if="importSuccess" class="alert alert-success alert-soft mt-4">
            <span>{{ importSuccess }}</span>
          </div>

          <div v-if="importLoading" class="grid min-h-72 place-items-center">
            <span class="loading loading-spinner loading-lg text-primary" />
          </div>

          <div v-else-if="!searched" class="rounded-box mt-5 border border-dashed border-base-300 p-10 text-center text-base-content/60">
            输入题号、标题或标签开始搜索。
          </div>

          <div v-else-if="results.length === 0" class="rounded-box mt-5 border border-dashed border-base-300 p-10 text-center">
            <h3 class="text-lg font-black">没有可导入的结果</h3>
            <p class="mt-2 text-sm text-base-content/60">换个关键词试试；如果刚刚加入了题目，当前结果可能已经清空。</p>
          </div>

          <div v-else class="mt-5 overflow-x-auto">
            <table class="table table-zebra table-sm min-w-[760px] table-fixed">
              <colgroup>
                <col class="w-[58%]" />
                <col class="w-36" />
                <col class="w-28" />
              </colgroup>
              <thead>
                <tr>
                  <th>题目</th>
                  <th>难度</th>
                  <th></th>
                </tr>
              </thead>
              <tbody v-auto-animate>
                <tr v-for="question in results" :key="question.questionFrontendId" class="transition duration-150 ease-out">
                  <td>
                    <div class="flex min-w-0 items-center gap-3">
                      <div
                        class="grid h-12 w-12 shrink-0 place-items-center rounded-box border border-base-300 bg-base-200 font-mono text-sm font-bold text-base-content/70"
                        aria-hidden="true"
                      >
                        #{{ question.questionFrontendId }}
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="truncate font-bold leading-6" :title="fullQuestionTitle(question)">
                          {{ displayQuestionTitle(question) }}
                        </div>
                        <div class="truncate text-sm text-base-content/55" :title="question.title">
                          {{ question.title }}
                        </div>
                        <div class="mt-1 flex min-w-0 flex-wrap gap-1">
                          <span v-for="tag in displayProblemTags(question).slice(0, 4)" :key="tag" class="badge badge-ghost badge-sm">
                            {{ tag }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <ProblemBadges :difficulty="question.difficulty" />
                  </td>
                  <th>
                    <NuxtLink
                      v-if="question.imported && question.problemId"
                      class="btn btn-success btn-soft btn-sm transition duration-150 ease-out active:scale-[0.98]"
                      :to="`/problems/${question.problemId}`"
                    >
                      <Check class="h-4 w-4" />
                      查看
                    </NuxtLink>
                    <button v-else-if="question.imported" class="btn btn-success btn-soft btn-sm" type="button" disabled>
                      <Check class="h-4 w-4" />
                      已加入
                    </button>
                    <button
                      v-else
                      class="btn btn-primary btn-soft btn-sm transition duration-150 ease-out active:scale-[0.98]"
                      type="button"
                      :disabled="isQuestionImporting(question.questionFrontendId)"
                      @click="importQuestion(question)"
                    >
                      <Loader2 v-if="isQuestionImporting(question.questionFrontendId)" class="h-4 w-4 animate-spin" />
                      <Plus v-else class="h-4 w-4" />
                      {{ isQuestionImporting(question.questionFrontendId) ? "加入中" : "加入" }}
                    </button>
                  </th>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <form method="dialog" class="modal-backdrop">
      <button>关闭</button>
    </form>
  </dialog>
</template>
