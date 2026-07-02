<script setup lang="ts">
import { resultLabel } from "@shared/problems";
import type { StatsSummary } from "@shared/types";

definePageMeta({ middleware: "auth" });

const requestFetch = useRequestFetch();

const { data, pending } = await useAsyncData("stats-summary", () => requestFetch<StatsSummary>("/api/stats/summary"));

const chartColors = {
  primary: "#078C8C",
  primarySoft: "#DFF3EE",
  base200: "#F4F5EC",
  base300: "#E5E7DA",
  content: "#12212C",
  muted: "#6F7A80",
  success: "#3FAE68",
  warning: "#D79B12",
  error: "#D9544D",
  info: "#4F8FA8",
};

const heatmapTotal = computed(() => data.value?.reviewHeatmap.reduce((total, item) => total + item.count, 0) || 0);
const heatmapMax = computed(() => Math.max(...(data.value?.reviewHeatmap.map((item) => item.count) || [0]), 1));
const trendTotal = computed(() => data.value?.reviewTrend30d.reduce((total, item) => total + item.total, 0) || 0);
const hasWeakTags = computed(() => Boolean(data.value?.weakTags.length));

function shortDate(date: string) {
  return date.slice(5);
}

const heatmapOption = computed<Record<string, unknown>>(() => {
  const heatmap = data.value?.reviewHeatmap || [];
  const rangeStart = heatmap[0]?.date;
  const rangeEnd = heatmap.at(-1)?.date;

  return {
    tooltip: {
      position: "top",
      formatter: (params: { data?: [string, number] }) => {
        const [date, count] = params.data || ["", 0];
        return `${date}<br/>复习 ${count} 次`;
      },
    },
    visualMap: {
      min: 0,
      max: heatmapMax.value,
      show: false,
      inRange: {
        color: [chartColors.base200, chartColors.primarySoft, chartColors.primary],
      },
    },
    calendar: {
      range: rangeStart && rangeEnd ? [rangeStart, rangeEnd] : undefined,
      top: 22,
      left: 20,
      right: 20,
      bottom: 8,
      cellSize: ["auto", 18],
      splitLine: {
        show: true,
        lineStyle: {
          color: chartColors.base300,
          width: 1,
        },
      },
      itemStyle: {
        color: chartColors.base200,
        borderWidth: 2,
        borderColor: "#FCFCF7",
      },
      yearLabel: { show: false },
      monthLabel: {
        color: chartColors.muted,
        fontSize: 12,
        nameMap: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
      },
      dayLabel: {
        firstDay: 1,
        color: chartColors.muted,
        fontSize: 12,
        nameMap: ["日", "一", "二", "三", "四", "五", "六"],
      },
    },
    series: [
      {
        type: "heatmap",
        coordinateSystem: "calendar",
        data: heatmap.map((item) => [item.date, item.count]),
      },
    ],
  };
});

const trendOption = computed<Record<string, unknown>>(() => {
  const trend = data.value?.reviewTrend30d || [];

  return {
    color: [chartColors.primary, chartColors.success, chartColors.error, chartColors.info, chartColors.warning],
    tooltip: {
      trigger: "axis",
    },
    legend: {
      top: 0,
      right: 8,
      textStyle: { color: chartColors.muted },
      itemWidth: 12,
      itemHeight: 8,
    },
    grid: {
      left: 34,
      right: 18,
      top: 46,
      bottom: 28,
    },
    xAxis: {
      type: "category",
      data: trend.map((item) => shortDate(item.date)),
      axisLine: { lineStyle: { color: chartColors.base300 } },
      axisTick: { show: false },
      axisLabel: { color: chartColors.muted, fontSize: 11 },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: chartColors.base300 } },
      axisLabel: { color: chartColors.muted },
    },
    series: [
      {
        name: "复习总数",
        type: "bar",
        barWidth: 10,
        itemStyle: { borderRadius: [5, 5, 0, 0] },
        data: trend.map((item) => item.total),
      },
      {
        name: resultLabel("easy"),
        type: "line",
        smooth: true,
        symbolSize: 6,
        data: trend.map((item) => item.easy),
      },
      {
        name: resultLabel("hard"),
        type: "line",
        smooth: true,
        symbolSize: 6,
        data: trend.map((item) => item.hard),
      },
      {
        name: resultLabel("solution"),
        type: "line",
        smooth: true,
        symbolSize: 6,
        data: trend.map((item) => item.solution),
      },
      {
        name: resultLabel("mastered"),
        type: "line",
        smooth: true,
        symbolSize: 6,
        data: trend.map((item) => item.mastered),
      },
    ],
  };
});

const stageOption = computed<Record<string, unknown>>(() => {
  const stages = data.value?.stageDistribution || [];

  return {
    color: [chartColors.primary],
    tooltip: {
      trigger: "axis",
      formatter: (params: Array<{ name: string; value: number }>) => {
        const item = params[0];
        return `阶段 ${item?.name}<br/>${item?.value || 0} 题`;
      },
    },
    grid: {
      left: 34,
      right: 18,
      top: 18,
      bottom: 28,
    },
    xAxis: {
      type: "category",
      data: stages.map((item) => item.stage),
      axisLine: { lineStyle: { color: chartColors.base300 } },
      axisTick: { show: false },
      axisLabel: { color: chartColors.muted },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: chartColors.base300 } },
      axisLabel: { color: chartColors.muted },
    },
    series: [
      {
        type: "bar",
        barWidth: 24,
        itemStyle: { borderRadius: [6, 6, 0, 0] },
        data: stages.map((item) => item.count),
      },
    ],
  };
});

const weakTagsOption = computed<Record<string, unknown>>(() => {
  const tags = [...(data.value?.weakTags || [])].reverse();

  return {
    color: [chartColors.error],
    tooltip: {
      trigger: "axis",
      formatter: (params: Array<{ name: string; value: number; dataIndex: number }>) => {
        const item = params[0];
        const tag = tags[item?.dataIndex || 0];
        return `${item?.name}<br/>薄弱分 ${item?.value || 0}<br/>涉及 ${tag?.count || 0} 题`;
      },
    },
    grid: {
      left: 74,
      right: 24,
      top: 14,
      bottom: 20,
    },
    xAxis: {
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: chartColors.base300 } },
      axisLabel: { color: chartColors.muted },
    },
    yAxis: {
      type: "category",
      data: tags.map((item) => item.tag),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: chartColors.content, fontWeight: 700 },
    },
    series: [
      {
        type: "bar",
        barWidth: 14,
        itemStyle: { borderRadius: [0, 7, 7, 0] },
        data: tags.map((item) => item.score),
      },
    ],
  };
});
</script>

<template>
  <AppFrame>
    <div class="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
      <div>
        <div class="badge badge-primary badge-soft mb-3">Stats</div>
        <h1 class="text-3xl font-black md:text-4xl">统计</h1>
        <p class="mt-2 text-base-content/65">看清最近的复习轨迹、记忆阶段和真正薄弱的标签。</p>
      </div>
      <div class="rounded-box border border-base-300 bg-base-100 px-4 py-3 text-sm text-base-content/65 shadow-sm">
        最近 6 个月共复习 <span class="font-black text-primary">{{ heatmapTotal }}</span> 次
      </div>
    </div>

    <div v-auto-animate>
      <div v-if="pending" class="grid min-h-96 place-items-center">
        <span class="loading loading-spinner loading-lg text-primary" />
      </div>

      <div v-else-if="data" class="space-y-5">
      <div v-auto-animate class="grid gap-3 md:grid-cols-4">
        <div class="stats bg-base-100 shadow-sm transition duration-150 ease-out hover:-translate-y-0.5">
          <div class="stat">
            <div class="stat-title">全部题目</div>
            <div class="stat-value metric-number">{{ data.total }}</div>
          </div>
        </div>
        <div class="stats bg-base-100 shadow-sm transition duration-150 ease-out hover:-translate-y-0.5">
          <div class="stat">
            <div class="stat-title">待复习</div>
            <div class="stat-value metric-number text-primary">{{ data.due }}</div>
          </div>
        </div>
        <div class="stats bg-base-100 shadow-sm transition duration-150 ease-out hover:-translate-y-0.5">
          <div class="stat">
            <div class="stat-title">已掌握</div>
            <div class="stat-value metric-number text-success">{{ data.mastered }}</div>
          </div>
        </div>
        <div class="stats bg-base-100 shadow-sm transition duration-150 ease-out hover:-translate-y-0.5">
          <div class="stat">
            <div class="stat-title">掌握率</div>
            <div class="stat-value metric-number text-secondary">{{ data.masteryRate }}%</div>
          </div>
        </div>
      </div>

      <section class="card bg-base-100 shadow-sm">
        <div class="card-body">
          <div class="flex flex-col justify-between gap-2 md:flex-row md:items-start">
            <div>
              <h2 class="card-title">复习热力图</h2>
              <p class="text-sm text-base-content/55">最近 6 个月，每个格子代表一天，颜色越深表示当天复习越多。</p>
            </div>
            <div class="badge badge-primary badge-soft">坚持视图</div>
          </div>
          <StatsChart :option="heatmapOption" height-class="h-[330px]" />
        </div>
      </section>

      <div v-auto-animate class="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <section class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <div class="flex flex-col justify-between gap-2 md:flex-row md:items-start">
              <div>
                <h2 class="card-title">最近 30 天复习趋势</h2>
                <p class="text-sm text-base-content/55">柱状图看复习量，折线看每种复习结果的走向。</p>
              </div>
              <div class="badge badge-ghost">{{ trendTotal }} 次</div>
            </div>
            <StatsChart :option="trendOption" :empty="trendTotal === 0" empty-text="最近 30 天还没有复习记录" height-class="h-80" />
          </div>
        </section>

        <section class="card bg-base-100 shadow-sm">
          <div class="card-body">
            <h2 class="card-title">记忆阶段分布</h2>
            <p class="text-sm text-base-content/55">看题库集中在哪些复习阶段，阶段越高代表间隔越长。</p>
            <StatsChart :option="stageOption" :empty="data.total === 0" empty-text="题库为空，暂无阶段分布" height-class="h-80" />
          </div>
        </section>
      </div>

      <section class="card bg-base-100 shadow-sm">
        <div class="card-body">
          <h2 class="card-title">薄弱标签</h2>
          <p class="text-sm text-base-content/55">按未掌握题目的卡住次数聚合，优先显示中文标签。</p>
          <StatsChart :option="weakTagsOption" :empty="!hasWeakTags" empty-text="暂时没有明显薄弱标签" height-class="h-80" />
        </div>
      </section>
      </div>
    </div>
  </AppFrame>
</template>
