<script setup lang="ts">
import { Check, ExternalLink, Loader2, RotateCcw } from "@lucide/vue";
import { displayProblemNumber, displayProblemTags, displayProblemTitle } from "@shared/problems";
import { studyListItemStatusLabel, studyListModeLabel } from "@shared/study-lists";
import type { Problem, StudyListDetail, StudyListMode, StudyListQuestion } from "@shared/types";

definePageMeta({ middleware: "auth" });

const route = useRoute();
const requestFetch = useRequestFetch();
const slug = computed(() => String(route.params.slug));
const dailyNewCount = ref(2);
const startMode = ref<StudyListMode>("follow_existing");
const startingList = ref(false);
const startingItem = ref("");
const updatingItem = ref("");

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

async function startStudyList() {
  if (startingList.value) return;
  startingList.value = true;
  try {
    await $fetch(`/api/study-lists/${slug.value}/start`, {
      method: "POST",
      body: { dailyNewCount: dailyNewCount.value, mode: startMode.value },
    });
    await refresh();
  } finally {
    startingList.value = false;
  }
}

async function updateMode(question: StudyListQuestion, mode: StudyListMode) {
  if (updatingItem.value) return;
  updatingItem.value = question.titleSlug;
  try {
    await $fetch(`/api/study-lists/${slug.value}/items/${question.titleSlug}`, {
      method: "PATCH",
      body: { mode },
    });
    await refresh();
  } finally {
    updatingItem.value = "";
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
    await navigateTo(`/problems/${problem.id}`);
  } finally {
    startingItem.value = "";
  }
}
</script>

<template>
  <AppFrame>
    <div v-if="pending" class="grid min-h-80 place-items-center">
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
            <div class="stat-title">已覆盖</div>
            <div class="stat-value metric-number text-success">{{ data.completed }}</div>
          </div>
        </div>
        <div class="stats bg-base-100 shadow-sm">
          <div class="stat">
            <div class="stat-title">完成率</div>
            <div class="stat-value metric-number text-primary">{{ data.percent }}%</div>
          </div>
        </div>
        <div class="stats bg-base-100 shadow-sm">
          <div class="stat">
            <div class="stat-title">每日新题</div>
            <div class="stat-value metric-number">{{ data.dailyNewCount ?? dailyNewCount }}</div>
          </div>
        </div>
      </div>

      <progress class="progress progress-primary" :value="data.completed" :max="data.total" />

      <section v-if="!data.enrolled" class="card bg-base-100 shadow-sm">
        <div class="card-body">
          <h2 class="card-title">开始这个题单</h2>
          <p class="text-sm text-base-content/60">如果题目已经在你的题库中，可以选择沿用原进度，或只在这个题单里重新学一遍。</p>
          <div class="mt-2 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
            <label class="select select-bordered flex items-center gap-2">
              <span class="text-sm text-base-content/55">每日新题</span>
              <select v-model.number="dailyNewCount">
                <option :value="1">1</option>
                <option :value="2">2</option>
                <option :value="3">3</option>
                <option :value="5">5</option>
                <option :value="8">8</option>
                <option :value="10">10</option>
                <option :value="15">15</option>
                <option :value="20">20</option>
              </select>
            </label>
            <div class="join">
              <button class="btn join-item flex-1" :class="{ 'btn-primary': startMode === 'follow_existing' }" type="button" @click="startMode = 'follow_existing'">依照原进度</button>
              <button class="btn join-item flex-1" :class="{ 'btn-primary': startMode === 'restart_in_list' }" type="button" @click="startMode = 'restart_in_list'">题单内重学</button>
            </div>
          </div>
          <div class="card-actions justify-end">
            <button class="btn btn-primary transition duration-150 ease-out active:scale-[0.98]" type="button" :disabled="startingList" @click="startStudyList">
              <Loader2 v-if="startingList" class="h-4 w-4 animate-spin" />
              开始学习
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
                <col class="w-[35%]" />
                <col class="w-[15%]" />
                <col class="w-[18%]" />
                <col class="w-[18%]" />
                <col class="w-[14%]" />
              </colgroup>
              <thead>
                <tr>
                  <th>题目</th>
                  <th>难度</th>
                  <th>题单状态</th>
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
                    <div class="grid gap-1">
                      <span class="badge badge-soft" :class="{ 'badge-success': question.status === 'mastered' || question.status === 'covered' || question.status === 'learned', 'badge-warning': question.status === 'planned' }">
                        {{ studyListItemStatusLabel(question.status) }}
                      </span>
                      <span class="text-xs text-base-content/50">{{ studyListModeLabel(question.mode) }}</span>
                    </div>
                  </td>
                  <td>
                    <ProblemSources v-if="question.sources.length" :sources="question.sources" :limit="2" />
                    <span v-else class="text-sm text-base-content/45">尚未进入题库</span>
                  </td>
                  <th>
                    <div class="flex flex-wrap justify-end gap-1">
                      <button
                        v-if="data.enrolled && question.mode !== 'restart_in_list'"
                        class="btn btn-ghost btn-xs transition duration-150 ease-out active:scale-[0.96]"
                        type="button"
                        :disabled="Boolean(updatingItem)"
                        @click="updateMode(question, 'restart_in_list')"
                      >
                        <RotateCcw class="h-3.5 w-3.5" />
                        重学
                      </button>
                      <button
                        v-if="data.enrolled && question.mode !== 'follow_existing'"
                        class="btn btn-ghost btn-xs transition duration-150 ease-out active:scale-[0.96]"
                        type="button"
                        :disabled="Boolean(updatingItem)"
                        @click="updateMode(question, 'follow_existing')"
                      >
                        <Check class="h-3.5 w-3.5" />
                        沿用
                      </button>
                      <button
                        v-if="data.enrolled && question.status !== 'covered' && question.status !== 'mastered' && question.status !== 'learned'"
                        class="btn btn-primary btn-soft btn-xs transition duration-150 ease-out active:scale-[0.96]"
                        type="button"
                        :disabled="Boolean(startingItem)"
                        @click="startQuestion(question)"
                      >
                        <Loader2 v-if="startingItem === question.titleSlug" class="h-3.5 w-3.5 animate-spin" />
                        开始
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
  </AppFrame>
</template>
