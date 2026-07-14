<script setup lang="ts">
import { ExternalLink, Loader2, Trash2 } from "@lucide/vue";
import { renderReviewMarkdown } from "@shared/markdown";
import { displayProblemNumber, displayProblemTags, displayProblemTitle, resultLabel, reviewResultButtonClass } from "@shared/problems";
import { REVIEW_NOTE_MAX_LENGTH } from "@shared/reviews";
import type { Problem, Review, ReviewResult } from "@shared/types";

definePageMeta({ middleware: "auth" });

const route = useRoute();
const id = computed(() => String(route.params.id));
const reviewResults: ReviewResult[] = ["easy", "hard", "solution", "mastered"];
const reviewing = ref<ReviewResult | "">("");
const selectedResult = ref<ReviewResult | null>(null);
const reviewNote = ref("");
const reviewModalOpen = ref(false);
const deleteModalOpen = ref(false);
const deleting = ref(false);
const actionError = ref("");
const requestFetch = useRequestFetch();

const { data, pending, error, refresh } = await useAsyncData(`problem-${id.value}`, () =>
  requestFetch<{ problem: Problem; history: Review[] }>(`/api/problems/${id.value}`),
);

const notedReviews = computed(() => data.value?.history.filter((review) => review.note?.trim()) || []);

function shouldShowEnglishTitle(problem: Problem) {
  return displayProblemTitle(problem) !== problem.title;
}

function reviewNotePlaceholder(result: ReviewResult | null) {
  const placeholders: Record<ReviewResult, string> = {
    easy: "这次记住了状态转移",
    hard: "忘了双指针收缩条件",
    solution: "边界没处理好，题解用了单调栈",
    mastered: "模板已经熟了，下次可快速过一遍",
  };
  return result ? placeholders[result] : "记录这次刷题的收获";
}

function openReviewNote(result: ReviewResult) {
  selectedResult.value = result;
  reviewNote.value = "";
  reviewModalOpen.value = true;
}

function closeReviewNote() {
  if (reviewing.value) return;
  reviewModalOpen.value = false;
  selectedResult.value = null;
  reviewNote.value = "";
}

function openDeleteConfirm() {
  deleteModalOpen.value = true;
}

function closeDeleteConfirm() {
  if (deleting.value) return;
  deleteModalOpen.value = false;
}

async function submitReview(result: ReviewResult | null = selectedResult.value) {
  if (!data.value?.problem || !result) return;
  actionError.value = "";
  reviewing.value = result;
  try {
    const idempotencyKey = crypto.randomUUID();
    await $fetch("/api/reviews", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: { problemId: data.value.problem.id, result, note: reviewNote.value },
    });
    reviewModalOpen.value = false;
    selectedResult.value = null;
    reviewNote.value = "";
    await refresh();
  } catch (err) {
    const fetchError = err as { statusCode?: number; statusMessage?: string; data?: { statusMessage?: string } };
    actionError.value = fetchError.statusCode === 429
      ? "操作太频繁了，稍等一下再试。"
      : fetchError.data?.statusMessage || fetchError.statusMessage || "提交失败，请稍后再试。";
  } finally {
    reviewing.value = "";
  }
}

async function deleteProblem() {
  if (!data.value?.problem) return;
  deleting.value = true;
  actionError.value = "";
  try {
    await $fetch(`/api/problems/${id.value}`, {
      method: "DELETE",
      query: { expectedVersion: data.value.problem.version },
    });
    await navigateTo("/problems");
  } catch (err) {
    const fetchError = err as { statusCode?: number };
    actionError.value = fetchError.statusCode === 409
      ? "这道题刚刚被其他操作更新了，请刷新后再删除。"
      : "删除失败，请稍后再试。";
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <AppFrame>
    <div v-auto-animate>
      <div v-if="pending" class="grid min-h-96 place-items-center">
        <div class="grid w-full gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div class="skeleton h-[34rem] w-full" />
          <div class="skeleton h-72 w-full" />
        </div>
      </div>

      <div v-else-if="error" class="alert alert-error alert-soft">
        <span>题目加载失败，请返回题库或刷新页面。</span>
      </div>

      <div v-else-if="data?.problem" class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section class="card bg-base-100 shadow-sm">
        <div class="card-body gap-5">
          <div v-auto-animate class="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p class="font-mono text-sm text-base-content/50">{{ displayProblemNumber(data.problem) }}</p>
              <h1 class="mt-2 text-3xl font-black leading-tight md:text-4xl">{{ displayProblemTitle(data.problem) }}</h1>
              <p v-if="shouldShowEnglishTitle(data.problem)" class="mt-2 text-base font-semibold text-base-content/55 md:text-lg">
                {{ data.problem.title }}
              </p>
              <div class="mt-3">
                <ProblemBadges :difficulty="data.problem.difficulty" />
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <a v-if="data.problem.urlCn" class="btn btn-outline btn-sm transition duration-150 ease-out active:scale-[0.98]" :href="data.problem.urlCn" target="_blank" rel="noreferrer">
                <ExternalLink class="h-4 w-4" />
                中文站
              </a>
              <a v-if="data.problem.urlEn" class="btn btn-outline btn-sm transition duration-150 ease-out active:scale-[0.98]" :href="data.problem.urlEn" target="_blank" rel="noreferrer">
                <ExternalLink class="h-4 w-4" />
                英文站
              </a>
            </div>
          </div>

          <div class="rounded-box bg-base-200 p-4">
            <div class="mb-2 flex items-center justify-between">
              <span class="font-bold">记忆轨道</span>
              <span class="text-sm text-base-content/60">第 {{ data.problem.stage }} 阶段</span>
            </div>
            <StageRail :stage="data.problem.stage" :status="data.problem.status" />
          </div>

          <div v-auto-animate class="grid gap-3 md:grid-cols-3">
            <div class="stat rounded-box bg-base-200 transition duration-150 ease-out hover:-translate-y-0.5">
              <div class="stat-title">复习次数</div>
              <div class="stat-value metric-number">{{ data.problem.reviewCount }}</div>
            </div>
            <div class="stat rounded-box bg-base-200 transition duration-150 ease-out hover:-translate-y-0.5">
              <div class="stat-title">卡住次数</div>
              <div class="stat-value metric-number text-warning">{{ data.problem.wrongCount }}</div>
            </div>
            <div class="stat rounded-box bg-base-200 transition duration-150 ease-out hover:-translate-y-0.5">
              <div class="stat-title">下次复习</div>
              <div class="stat-value text-xl">{{ data.problem.nextReviewAt || "无需排期" }}</div>
            </div>
          </div>

          <div>
            <h2 class="mb-2 font-black">标签</h2>
            <div v-if="displayProblemTags(data.problem).length > 0" v-auto-animate class="flex flex-wrap gap-2">
              <span v-for="tag in displayProblemTags(data.problem)" :key="tag" class="badge badge-ghost">{{ tag }}</span>
            </div>
            <p v-else class="text-sm text-base-content/55">暂无标签</p>
          </div>

          <div>
            <h2 class="mb-2 font-black">来源与题单</h2>
            <ProblemSources :sources="data.problem.sources" :limit="6" />
          </div>

          <div>
            <h2 class="mb-3 font-black">复习收获</h2>
            <div v-auto-animate>
              <div v-if="notedReviews.length === 0" class="rounded-box border border-dashed border-base-300 p-6 text-center text-base-content/60">
                还没有记录收获。
              </div>
              <div v-else class="space-y-3">
                <article v-for="review in notedReviews" :key="review.id" class="rounded-box border border-base-300 bg-base-200/45 p-4">
                  <div class="mb-2 flex flex-wrap items-center gap-2 text-sm">
                    <span class="badge badge-soft">{{ resultLabel(review.result) }}</span>
                    <span class="text-base-content/50">{{ review.reviewedAt }}</span>
                  </div>
                  <div class="review-markdown text-base-content/80" v-html="renderReviewMarkdown(review.note)" />
                </article>
              </div>
            </div>
          </div>

          <div>
            <h2 class="mb-3 font-black">复习历史</h2>
            <div v-auto-animate>
              <div v-if="data.history.length === 0" class="rounded-box border border-dashed border-base-300 p-6 text-center text-base-content/60">
                还没有复习记录。
              </div>
              <div v-else class="overflow-x-auto">
                <table class="table table-zebra">
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>结果</th>
                      <th>阶段</th>
                      <th>下次</th>
                    </tr>
                  </thead>
                  <tbody v-auto-animate>
                    <tr v-for="review in data.history" :key="review.id">
                      <td>{{ review.reviewedAt }}</td>
                      <td>{{ resultLabel(review.result) }}</td>
                      <td>{{ review.previousStage }} → {{ review.nextStage }}</td>
                      <td>{{ review.nextReviewAt || "无需排期" }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside class="space-y-5">
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <h2 class="card-title">记录一次复习</h2>
            <label class="grid gap-2">
              <span class="text-sm font-semibold text-base-content/65">本次备注，可不填</span>
              <textarea
                v-model="reviewNote"
                class="textarea min-h-24 w-full"
                :maxlength="REVIEW_NOTE_MAX_LENGTH"
                :placeholder="reviewNotePlaceholder(null)"
                :disabled="Boolean(reviewing)"
              />
              <span class="text-right text-xs text-base-content/45">{{ reviewNote.length }}/{{ REVIEW_NOTE_MAX_LENGTH }}</span>
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
                :disabled="Boolean(reviewing)"
                @click="submitReview(result)"
              >
                <Loader2 v-if="reviewing === result" class="h-4 w-4 animate-spin" />
                {{ resultLabel(result) }}
              </button>
            </div>
          </div>
        </div>

        <button class="btn btn-error btn-outline w-full transition duration-150 ease-out active:scale-[0.98]" type="button" :disabled="deleting" @click="openDeleteConfirm">
          <Loader2 v-if="deleting" class="h-4 w-4 animate-spin" />
          <Trash2 v-else class="h-4 w-4" />
          删除题目
        </button>
      </aside>

      <div class="modal modal-middle" :class="{ 'modal-open': reviewModalOpen }" role="dialog" aria-modal="true">
        <div v-auto-animate class="modal-box">
          <h2 class="text-xl font-black">记录：{{ selectedResult ? resultLabel(selectedResult) : "本次复习" }}</h2>
          <form class="mt-4 space-y-4" @submit.prevent="submitReview()">
            <label class="block">
              <span class="mb-2 block font-semibold">这次刷题有什么收获？</span>
              <textarea
                v-model="reviewNote"
                class="textarea min-h-32 w-full"
                :maxlength="REVIEW_NOTE_MAX_LENGTH"
                :placeholder="reviewNotePlaceholder(selectedResult)"
                :disabled="Boolean(reviewing)"
              />
            </label>
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-base-content/45">{{ reviewNote.length }}/{{ REVIEW_NOTE_MAX_LENGTH }}</span>
              <div class="modal-action mt-0">
                <button class="btn btn-ghost transition duration-150 ease-out active:scale-[0.98]" type="button" :disabled="Boolean(reviewing)" @click="closeReviewNote">取消</button>
                <button class="btn btn-primary transition duration-150 ease-out active:scale-[0.98]" type="submit" :disabled="Boolean(reviewing)">
                  <Loader2 v-if="reviewing" class="h-4 w-4 animate-spin" />
                  提交
                </button>
              </div>
            </div>
          </form>
        </div>
        <button class="modal-backdrop" type="button" :disabled="Boolean(reviewing)" @click="closeReviewNote">关闭</button>
      </div>

      <div class="modal modal-middle" :class="{ 'modal-open': deleteModalOpen }" role="dialog" aria-modal="true">
        <div v-auto-animate class="modal-box">
          <div class="flex items-start gap-3">
            <div class="grid h-11 w-11 shrink-0 place-items-center rounded-box bg-error/10 text-error">
              <Trash2 class="h-5 w-5" />
            </div>
            <div>
              <h2 class="text-xl font-black">删除这道题？</h2>
              <p v-if="data?.problem" class="mt-2 font-semibold">
                {{ displayProblemNumber(data.problem) }} {{ displayProblemTitle(data.problem) }}
              </p>
              <p class="mt-2 text-sm text-base-content/60">这会同时删除全部复习记录，操作无法撤销。</p>
            </div>
          </div>

          <div class="modal-action">
            <button class="btn btn-ghost transition duration-150 ease-out active:scale-[0.98]" type="button" :disabled="deleting" @click="closeDeleteConfirm">取消</button>
            <button class="btn btn-error transition duration-150 ease-out active:scale-[0.98]" type="button" :disabled="deleting" @click="deleteProblem">
              <Loader2 v-if="deleting" class="h-4 w-4 animate-spin" />
              {{ deleting ? "删除中" : "确认删除" }}
            </button>
          </div>
        </div>
        <button class="modal-backdrop" type="button" :disabled="deleting" @click="closeDeleteConfirm">关闭</button>
      </div>
      </div>
    </div>
  </AppFrame>
</template>
