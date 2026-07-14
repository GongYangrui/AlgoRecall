<script setup lang="ts">
import { ExternalLink, Loader2 } from "@lucide/vue";
import { displayProblemNumber, displayProblemTags, displayProblemTitle, resultLabel, reviewResultButtonClass } from "@shared/problems";
import { REVIEW_NOTE_MAX_LENGTH } from "@shared/reviews";
import { getToday } from "@shared/schedule";
import type { Problem, ReviewResult, StudyListQueueResult, TodayStudyPlan } from "@shared/types";

definePageMeta({ middleware: "auth" });

const today = getToday();
const reviewResults: ReviewResult[] = ["easy", "hard", "solution", "mastered"];
const submitting = ref<ReviewResult | "">("");
const dismissed = ref(new Set<string>());
const selectedId = ref("");
const selectedReviewProblem = ref<Problem | null>(null);
const selectedResult = ref<ReviewResult | null>(null);
const reviewNote = ref("");
const reviewNotes = ref<Record<string, string>>({});
const reviewModalOpen = ref(false);
const queueingStudyList = ref("");
const actionError = ref("");
const requestFetch = useRequestFetch();

const { data, pending, error, refresh } = await useAsyncData("today-study-plan", () => requestFetch<TodayStudyPlan>("/api/study-plan/today"));

const dueProblems = computed(() => (data.value?.dueProblems || []).filter((problem) => !dismissed.value.has(problem.id)));
const extraStudyLists = computed(() => data.value?.extraStudyLists || []);

const currentProblem = computed(() => dueProblems.value.find((problem) => problem.id === selectedId.value) || dueProblems.value[0] || null);

watch(
  dueProblems,
  (items) => {
    if (!selectedId.value || !items.some((problem) => problem.id === selectedId.value)) {
      selectedId.value = items[0]?.id || "";
    }
  },
  { immediate: true },
);

function reviewNotePlaceholder(result: ReviewResult | null) {
  const placeholders: Record<ReviewResult, string> = {
    easy: "这次记住了状态转移",
    hard: "忘了双指针收缩条件",
    solution: "边界没处理好，题解用了单调栈",
    mastered: "模板已经熟了，下次可快速过一遍",
  };
  return result ? placeholders[result] : "记录这次刷题的收获";
}

function openReviewNote(problem: Problem, result: ReviewResult) {
  selectedReviewProblem.value = problem;
  selectedResult.value = result;
  reviewNote.value = "";
  reviewModalOpen.value = true;
}

function closeReviewNote() {
  if (submitting.value) return;
  reviewModalOpen.value = false;
  selectedReviewProblem.value = null;
  selectedResult.value = null;
  reviewNote.value = "";
}

function setReviewNote(problemId: string, value: string) {
  reviewNotes.value = {
    ...reviewNotes.value,
    [problemId]: value.slice(0, REVIEW_NOTE_MAX_LENGTH),
  };
}

function textareaValue(event: Event) {
  return event.target instanceof HTMLTextAreaElement ? event.target.value : "";
}

async function submitReview(problem: Problem | null = selectedReviewProblem.value, result: ReviewResult | null = selectedResult.value) {
  if (!problem || !result) return;
  actionError.value = "";
  submitting.value = result;
  try {
    const idempotencyKey = crypto.randomUUID();
    await $fetch("/api/reviews", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: { problemId: problem.id, result, note: reviewNotes.value[problem.id] ?? reviewNote.value },
    });
    reviewModalOpen.value = false;
    selectedReviewProblem.value = null;
    selectedResult.value = null;
    reviewNote.value = "";
    setReviewNote(problem.id, "");
    dismissed.value = new Set(dismissed.value).add(problem.id);
    await refresh();
  } catch (err) {
    const fetchError = err as { statusCode?: number; statusMessage?: string; data?: { statusMessage?: string } };
    actionError.value = fetchError.statusCode === 429
      ? "操作太频繁了，稍等一下再试。"
      : fetchError.data?.statusMessage || fetchError.statusMessage || "提交失败，请稍后再试。";
  } finally {
    submitting.value = "";
  }
}

async function queueExtraStudyList(slug: string) {
  if (queueingStudyList.value) return;
  queueingStudyList.value = slug;
  try {
    await $fetch<StudyListQueueResult>(`/api/study-lists/${slug}/queue-next`, { method: "POST" });
    await refresh();
  } finally {
    queueingStudyList.value = "";
  }
}

function fullProblemTitle(problem: Problem) {
  const chineseTitle = displayProblemTitle(problem);
  return chineseTitle === problem.title ? chineseTitle : `${chineseTitle} / ${problem.title}`;
}

</script>

<template>
  <AppFrame>
    <div class="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
      <div>
        <div class="badge badge-primary badge-soft mb-3">今日 {{ today }}</div>
        <h1 class="text-3xl font-black md:text-4xl">今日复习</h1>
        <p class="mt-2 text-base-content/65">按顺序清掉到期题目，让每道题继续沿着记忆轨道前进。</p>
      </div>
      <NuxtLink to="/problems" class="btn btn-outline">打开题库</NuxtLink>
    </div>

    <div v-auto-animate class="mb-5 grid gap-3 md:grid-cols-2">
      <div class="stats bg-base-100 shadow-sm transition duration-150 ease-out hover:-translate-y-0.5">
        <div class="stat">
          <div class="stat-title">待复习</div>
          <div class="stat-value metric-number text-primary">{{ dueProblems.length }}</div>
        </div>
      </div>
      <div class="stats bg-base-100 shadow-sm transition duration-150 ease-out hover:-translate-y-0.5">
        <div class="stat">
          <div class="stat-title">已掌握</div>
          <div class="stat-value metric-number text-success">{{ data?.totals.mastered || 0 }}</div>
        </div>
      </div>
    </div>

    <div v-auto-animate>
      <div v-if="pending" class="grid min-h-80 place-items-center">
        <div class="grid w-full gap-4 lg:grid-cols-[minmax(0,1fr)_430px]">
          <div class="skeleton h-96 w-full" />
          <div class="skeleton h-80 w-full" />
        </div>
      </div>

      <div v-else-if="error" class="alert alert-error alert-soft">
        <span>今日复习加载失败，请刷新页面重试。</span>
      </div>

      <div v-else-if="dueProblems.length === 0" class="hero min-h-96 rounded-box bg-base-100">
        <div class="hero-content text-center">
          <div>
            <h2 class="text-3xl font-black">今天清空了</h2>
            <p class="mt-3 text-base-content/65">复习队列已经没有到期题目。</p>
            <div v-if="extraStudyLists.length" class="mt-6 grid gap-3">
              <p class="text-sm font-semibold text-base-content/60">学有余力，可以从题单继续加入一批。</p>
              <div class="flex flex-wrap justify-center gap-2">
                <button
                  v-for="list in extraStudyLists"
                  :key="list.slug"
                  class="btn btn-primary btn-soft transition duration-150 ease-out active:scale-[0.98]"
                  type="button"
                  :disabled="Boolean(queueingStudyList)"
                  @click="queueExtraStudyList(list.slug)"
                >
                  <Loader2 v-if="queueingStudyList === list.slug" class="h-4 w-4 animate-spin" />
                  {{ list.title }}，加入 {{ Math.min(list.dailyNewCount, list.remaining) }} 题
                </button>
              </div>
            </div>
            <div class="mt-6 flex justify-center gap-2">
              <NuxtLink to="/problems" class="btn btn-outline transition duration-150 ease-out active:scale-[0.98]">管理题库</NuxtLink>
              <NuxtLink to="/study-lists" class="btn btn-primary transition duration-150 ease-out active:scale-[0.98]">浏览题单</NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="grid gap-5">
      <div v-if="dueProblems.length" class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body p-0">
          <div class="flex items-center justify-between border-b border-base-300 px-5 py-4">
            <h2 class="font-black">复习队列</h2>
            <span class="badge badge-primary badge-soft">{{ dueProblems.length }} 题</span>
          </div>
          <div class="overflow-x-auto">
            <table class="table table-zebra table-sm min-w-[860px] table-fixed">
              <colgroup>
                <col class="w-[46%]" />
                <col class="w-32" />
                <col class="w-[20%]" />
                <col class="w-44" />
                <col class="w-24" />
              </colgroup>
              <thead>
                <tr>
                  <th>题目</th>
                  <th>难度</th>
                  <th>来源</th>
                  <th>记忆阶段</th>
                  <th></th>
                </tr>
              </thead>
              <tbody v-auto-animate>
                <tr
                  v-for="problem in dueProblems"
                  :key="problem.id"
                  class="cursor-pointer transition duration-150 ease-out hover:bg-base-200/70"
                  :class="{ 'bg-base-200': currentProblem?.id === problem.id }"
                  @click="selectedId = problem.id"
                >
                  <td>
                    <div class="flex min-w-0 items-center gap-3">
                      <div
                        class="grid h-12 w-12 shrink-0 place-items-center rounded-box border border-base-300 bg-base-200 font-mono text-sm font-bold text-base-content/70"
                        :class="{ 'border-primary bg-primary text-primary-content': currentProblem?.id === problem.id }"
                        aria-hidden="true"
                      >
                        {{ displayProblemNumber(problem) }}
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="truncate font-bold leading-6" :title="fullProblemTitle(problem)">
                          {{ displayProblemTitle(problem) }}
                        </div>
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
                  <td>
                    <ProblemBadges :difficulty="problem.difficulty" />
                  </td>
                  <td>
                    <ProblemSources :sources="problem.sources" :limit="2" />
                  </td>
                  <td>
                    <div class="w-36">
                      <StageRail :stage="problem.stage" :status="problem.status" />
                    </div>
                  </td>
                  <th>
                    <button class="btn btn-ghost btn-xs transition duration-150 ease-out active:scale-[0.96]" type="button" @click.stop="selectedId = problem.id">查看</button>
                  </th>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <aside class="card h-fit bg-base-100 shadow-sm xl:sticky xl:top-24">
        <div class="card-body">
          <div class="review-card-shell">
            <Transition name="review-card" mode="out-in">
              <div v-if="currentProblem" :key="currentProblem.id" class="review-card-panel grid gap-5">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="font-mono text-sm text-base-content/50">{{ displayProblemNumber(currentProblem) }}</p>
                    <h2 class="mt-1 text-2xl font-black leading-tight">{{ displayProblemTitle(currentProblem) }}</h2>
                  </div>
                  <ProblemBadges :difficulty="currentProblem.difficulty" />
                </div>

                <StageRail :stage="currentProblem.stage" :status="currentProblem.status" />
                <ProblemSources :sources="currentProblem.sources" :limit="3" />

                <div class="flex flex-wrap gap-2">
                  <a v-if="currentProblem.urlCn" class="btn btn-outline btn-sm transition duration-150 ease-out active:scale-[0.98]" :href="currentProblem.urlCn" target="_blank" rel="noreferrer">
                    <ExternalLink class="h-4 w-4" />
                    中文站
                  </a>
                  <a v-if="currentProblem.urlEn" class="btn btn-outline btn-sm transition duration-150 ease-out active:scale-[0.98]" :href="currentProblem.urlEn" target="_blank" rel="noreferrer">
                    <ExternalLink class="h-4 w-4" />
                    英文站
                  </a>
                  <NuxtLink class="btn btn-outline btn-sm transition duration-150 ease-out active:scale-[0.98]" :to="`/problems/${currentProblem.id}`">详情</NuxtLink>
                </div>

                <label class="grid gap-2">
                  <span class="text-sm font-semibold text-base-content/65">本次备注，可不填</span>
                  <textarea
                    class="textarea min-h-24 w-full"
                    :maxlength="REVIEW_NOTE_MAX_LENGTH"
                    :placeholder="reviewNotePlaceholder(null)"
                    :disabled="Boolean(submitting)"
                    :value="reviewNotes[currentProblem.id] || ''"
                    @input="setReviewNote(currentProblem.id, textareaValue($event))"
                  />
                  <span class="text-right text-xs text-base-content/45">{{ (reviewNotes[currentProblem.id] || '').length }}/{{ REVIEW_NOTE_MAX_LENGTH }}</span>
                </label>

                <div v-if="actionError" class="alert alert-error alert-soft">
                  <span>{{ actionError }}</span>
                </div>

                <div v-auto-animate class="grid gap-2">
                  <button
                    v-for="result in reviewResults"
                    :key="result"
                    class="btn btn-soft transition duration-150 ease-out active:scale-[0.98]"
                    :class="reviewResultButtonClass(result)"
                    type="button"
                    :disabled="Boolean(submitting)"
                    @click="submitReview(currentProblem, result)"
                  >
                    <Loader2 v-if="submitting === result" class="h-4 w-4 animate-spin" />
                    {{ resultLabel(result) }}
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </aside>
      </div>

      <div class="modal modal-middle" :class="{ 'modal-open': reviewModalOpen }" role="dialog" aria-modal="true">
        <div v-auto-animate class="modal-box">
          <h2 class="text-xl font-black">记录：{{ selectedResult ? resultLabel(selectedResult) : "本次复习" }}</h2>
          <p v-if="selectedReviewProblem" class="mt-2 text-sm text-base-content/55">
            {{ displayProblemNumber(selectedReviewProblem) }} {{ displayProblemTitle(selectedReviewProblem) }}
          </p>
          <form class="mt-4 space-y-4" @submit.prevent="submitReview()">
            <label class="block">
              <span class="mb-2 block font-semibold">这次刷题有什么收获？</span>
              <textarea
                v-model="reviewNote"
                class="textarea min-h-32 w-full"
                :maxlength="REVIEW_NOTE_MAX_LENGTH"
                :placeholder="reviewNotePlaceholder(selectedResult)"
                :disabled="Boolean(submitting)"
              />
            </label>
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-base-content/45">{{ reviewNote.length }}/{{ REVIEW_NOTE_MAX_LENGTH }}</span>
              <div class="modal-action mt-0">
                <button class="btn btn-ghost transition duration-150 ease-out active:scale-[0.98]" type="button" :disabled="Boolean(submitting)" @click="closeReviewNote">取消</button>
                <button class="btn btn-primary transition duration-150 ease-out active:scale-[0.98]" type="submit" :disabled="Boolean(submitting)">
                  <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
                  提交
                </button>
              </div>
            </div>
          </form>
        </div>
        <button class="modal-backdrop" type="button" :disabled="Boolean(submitting)" @click="closeReviewNote">关闭</button>
      </div>
    </div>
    </div>
  </AppFrame>
</template>
