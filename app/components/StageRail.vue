<script setup lang="ts">
import { REVIEW_INTERVALS } from "@shared/schedule";

const props = defineProps<{
  stage: number;
  status?: string;
}>();

const activeStage = computed(() => (props.status === "mastered" ? REVIEW_INTERVALS.length : props.stage));
</script>

<template>
  <div class="flex items-center gap-1.5" aria-label="记忆阶段">
    <span
      v-for="(_, index) in REVIEW_INTERVALS"
      :key="index"
      class="h-2.5 flex-1 rounded-full"
      :class="index < activeStage ? 'bg-primary' : 'bg-base-300'"
    />
  </div>
</template>
