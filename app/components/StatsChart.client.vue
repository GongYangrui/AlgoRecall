<script setup lang="ts">
import { BarChart, HeatmapChart, LineChart } from "echarts/charts";
import { CalendarComponent, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import VChart from "vue-echarts";
import type { PropType } from "vue";

use([CanvasRenderer, BarChart, HeatmapChart, LineChart, CalendarComponent, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent]);

defineProps({
  option: {
    type: Object as PropType<Record<string, unknown>>,
    required: true,
  },
  empty: {
    type: Boolean,
    default: false,
  },
  emptyText: {
    type: String,
    default: "暂无数据",
  },
  heightClass: {
    type: String,
    default: "h-80",
  },
});
</script>

<template>
  <div class="relative w-full" :class="heightClass">
    <div v-if="empty" class="grid h-full place-items-center rounded-box border border-dashed border-base-300 text-sm text-base-content/55">
      {{ emptyText }}
    </div>
    <VChart v-else class="h-full w-full" :option="option" autoresize />
  </div>
</template>
