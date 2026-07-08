<script setup lang="ts">
import { ExternalLink, Loader2 } from "@lucide/vue";
import { displayProblemNumber, displayProblemTags, displayProblemTitle } from "@shared/problems";
import type { Problem, StudyListDetail, StudyListQuestion } from "@shared/types";

definePageMeta({ middleware: "auth" });

const route = useRoute();
const requestFetch = useRequestFetch();
const slug = computed(() => String(route.params.slug));
const dailyNewCount = ref(2);
const startingList = ref(false);
const startingItem = ref("");
const queueFeedback = ref<QueueFeedback | null>(null);

type QueueFeedback = {
  status: "success" | "error";
  title: string;
  message: string;
  problemId?: string;
};

type RequestError = {
  data?: {
    message?: string;
    statusMessage?: string;
  };
  message?: string;
  statusCode?: number;
  statusMessage?: string;
};

const { data, pending, refresh } = await useAsyncData(
  () => `study-list-${slug.value}`,
  () => requestFetch<StudyListDetail>(`/api/study-lists/${slug.value}`),
  { watch: [slug] },
);

watch(
  data,
  (detail) => {
    if (detail?.dailyNewCount !== null && detail?.dailyNewCount !== undefined) {
      dailyNewCount.value = detail.dailyNewCount;
    }
  },
  { immediate: true },
);

function questionTitle(question: StudyListQuestion) {
  return displayProblemTitle(question);
}

function fullQuestionTitle(question: StudyListQuestion) {
  const chineseTitle = questionTitle(question);
  return chineseTitle === question.title ? chineseTitle : `${chineseTitle} / ${question.title}`;
}

function problemLink(question: StudyListQuestion) {
  return question.problem ? `/problems/${question.problem.id}` : "";
}

function closeQueueFeedback() {
  queueFeedback.value = null;
}

function queueErrorMessage(error: unknown) {
  const requestError = error as RequestError;
  if (requestError.statusCode === 401) return "登录状态已过期，请重新登录后再试。";
  if (requestError.statusCode === 404) return "没有找到这道题，可能题单数据已经更新。";
  return requestError.data?.message || requestError.data?.statusMessage || requestError.statusMessage || "加入队列失败，请稍后再试。";
}

async function refreshStudyList() {
  const scrollY = import.meta.client ? window.scrollY : 0;
  await refresh();
  await nextTick();
  if (import.meta.client) {
    window.scrollTo({ top: scrollY });
  }
}

async function startStudyList() {
  if (startingList.value) return;
  startingList.value = true;
  try {
    await $fetch(`/api/study-lists/${slug.value}/start`, {
      method: "POST",
      body: { dailyNewCount: dailyNewCount.value },
    });
    await refreshStudyList();
  } finally {
    startingList.value = false;
  }
}

async function startQuestion(question: StudyListQuestion) {
  if (startingItem.value) return;
  startingItem.value = question.titleSlug;
  try {
    const problem = await $fetch<Problem>(`/api/study-lists/${slug.value}/items/${question.titleSlug}/start`, {
      method: "POST",
    });
    await refresh();
    queueFeedback.value = {
      status: "success",
      title: "已加入复习队列",
      message: `${questionTitle(question)} 已加入你的题库和复习队列。`,
      problemId: problem.id,
    };
    try {
      await refreshStudyList();
    } catch {
      // The queue operation already succeeded. Keep the success feedback visible even if the refresh fails.
    }
  } catch (error) {
    queueFeedback.value = {
      status: "error",
      title: "加入失败",
      message: queueErrorMessage(error),
    };
  } finally {
    startingItem.value = "";
  }
}
</script>

<template>
  <AppFrame>
    <div v-if="pending && !data" class="grid min-h-80 place-items-center">
      <span class="loading loading-spinner loading-lg text-primary" />
    </div>

    <div v-else-if="data" class="grid gap-5">
      <div class="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div class="mb-3 flex flex-wrap gap-2">
            <NuxtLink to="/study-lists" class="badge badge-ghost">题单</NuxtLink>
            <span class="badge badge-primary badge-soft">{{ data.locale === "cn" ? "中文站" : "英文站" }}</span>
            <span v-if="data.enrolled" class="badge badge-success badge-soft">已加入</span>
          </div>
          <h1 class="text-3xl font-black md:text-4xl">{{ data.title }}</h1>
          <p class="mt-2 max-w-3xl text-base-content/65">{{ data.description }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <a class="btn btn-outline transition duration-150 ease-out active:scale-[0.98]" :href="data.sourceUrl" target="_blank" rel="noreferrer">
            <ExternalLink class="h-4 w-4" />
            原题单
          </a>
          <NuxtLink to="/app" class="btn btn-primary transition duration-150 ease-out active:scale-[0.98]">今日学习</NuxtLink>
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-4">
        <div class="stats bg-base-100 shadow-sm">
          <div class="stat">
            <div class="stat-title">题目数</div>
            <div class="stat-value metric-number">{{ data.total }}</div>
          </div>
        </div>
        <div class="stats bg-base-100 shadow-sm">
          <div class="stat">
            <div class="stat-title">已入队</div>
            <div class="stat-value metric-number text-success">{{ data.completed }}</div>
          </div>
        </div>
        <div class="stats bg-base-100 shadow-sm">
          <div class="stat">
            <div class="stat-title">入队率</div>
            <div class="stat-value metric-number text-primary">{{ data.percent }}%</div>
          </div>
        </div>
        <div class="stats bg-base-100 shadow-sm">
          <div class="stat">
            <div class="stat-title">每日加入</div>
            <div class="stat-value metric-number">{{ data.dailyNewCount ?? dailyNewCount }}</div>
          </div>
        </div>
      </div>

      <progress class="progress progress-primary" :value="data.completed" :max="data.total" />

      <section v-if="!data.enrolled" class="card bg-base-100 shadow-sm">
        <div class="card-body">
          <h2 class="card-title">加入这个题单</h2>
          <p class="text-sm text-base-content/60">每天按顺序把指定数量的题加入复习队列；已经在题库里的题只记录来源，不重复加入。</p>
          <div class="mt-2 max-w-48">
            <label class="label" for="daily-new-count">每日加入</label>
            <select id="daily-new-count" v-model.number="dailyNewCount" class="select select-bordered w-full">
              <option :value="1">1</option>
              <option :value="2">2</option>
              <option :value="3">3</option>
              <option :value="5">5</option>
              <option :value="8">8</option>
              <option :value="10">10</option>
              <option :value="15">15</option>
              <option :value="20">20</option>
            </select>
          </div>
          <div class="card-actions justify-end">
            <button class="btn btn-primary transition duration-150 ease-out active:scale-[0.98]" type="button" :disabled="startingList" @click="startStudyList">
              <Loader2 v-if="startingList" class="h-4 w-4 animate-spin" />
              加入题单
            </button>
          </div>
        </div>
      </section>

      <section class="card bg-base-100 shadow-sm">
        <div class="card-body p-0">
          <div class="flex items-center justify-between border-b border-base-300 px-5 py-4">
            <h2 class="font-black">题目顺序</h2>
            <span class="badge badge-primary badge-soft">{{ data.items.length }} 题</span>
          </div>
          <div class="overflow-x-auto">
            <table class="table table-zebra table-sm min-w-[1080px] table-fixed">
              <colgroup>
                <col class="w-[44%]" />
                <col class="w-[15%]" />
                <col class="w-[25%]" />
                <col class="w-[16%]" />
              </colgroup>
              <thead>
                <tr>
                  <th>题目</th>
                  <th>难度</th>
                  <th>来源</th>
                  <th></th>
                </tr>
              </thead>
              <tbody v-auto-animate>
                <tr v-for="question in data.items" :key="question.titleSlug">
                  <td>
                    <div class="flex min-w-0 items-center gap-3">
                      <div class="grid h-12 w-12 shrink-0 place-items-center rounded-box border border-base-300 bg-base-200 font-mono text-sm font-bold text-base-content/70">
                        #{{ question.questionFrontendId }}
                      </div>
                      <div class="min-w-0 flex-1">
                        <NuxtLink
                          v-if="question.problem"
                          class="block truncate font-bold leading-6 transition duration-150 ease-out hover:link"
                          :to="problemLink(question)"
                          :title="fullQuestionTitle(question)"
                        >
                          {{ questionTitle(question) }}
                        </NuxtLink>
                        <div v-else class="truncate font-bold leading-6" :title="fullQuestionTitle(question)">
                          {{ questionTitle(question) }}
                        </div>
                        <div class="truncate text-sm text-base-content/55" :title="question.title">{{ question.title }}</div>
                        <div class="mt-1 flex min-w-0 flex-wrap gap-1">
                          <span v-for="tag in displayProblemTags(question).slice(0, 3)" :key="tag" class="badge badge-ghost badge-sm">{{ tag }}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td><ProblemBadges :difficulty="question.difficulty" /></td>
                  <td>
                    <ProblemSources v-if="question.sources.length" :sources="question.sources" :limit="2" />
                    <span v-else class="text-sm text-base-content/45">尚未进入题库</span>
                  </td>
                  <th>
                    <div class="flex flex-wrap justify-end gap-1">
                      <NuxtLink v-if="question.problem" class="btn btn-ghost btn-xs transition duration-150 ease-out active:scale-[0.96]" :to="problemLink(question)">查看</NuxtLink>
                      <button
                        v-else-if="data.enrolled"
                        class="btn btn-primary btn-soft btn-xs transition duration-150 ease-out active:scale-[0.96]"
                        type="button"
                        :disabled="Boolean(startingItem)"
                        @click="startQuestion(question)"
                      >
                        <Loader2 v-if="startingItem === question.titleSlug" class="h-3.5 w-3.5 animate-spin" />
                        加入队列
                      </button>
                    </div>
                  </th>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
    <div v-if="queueFeedback" class="modal modal-open" role="dialog" aria-modal="true">
      <div class="modal-box">
        <div
          role="alert"
          class="alert alert-soft"
          :class="queueFeedback.status === 'success' ? 'alert-success' : 'alert-error'"
        >
          <div>
            <h3 class="font-bold">{{ queueFeedback.title }}</h3>
            <p class="text-sm">{{ queueFeedback.message }}</p>
          </div>
        </div>
        <div class="modal-action">
          <NuxtLink
            v-if="queueFeedback.problemId"
            class="btn btn-primary transition duration-150 ease-out active:scale-[0.98]"
            :to="`/problems/${queueFeedback.problemId}`"
            @click="closeQueueFeedback"
          >
            查看题目
          </NuxtLink>
          <button class="btn btn-outline transition duration-150 ease-out active:scale-[0.98]" type="button" @click="closeQueueFeedback">留在题单</button>
        </div>
      </div>
      <button class="modal-backdrop" type="button" aria-label="关闭提示" @click="closeQueueFeedback" />
    </div>
  </AppFrame>
</template>
