<script setup lang="ts">
import type { ProblemSource } from "@shared/types";

const props = withDefaults(
  defineProps<{
    sources?: ProblemSource[] | null;
    limit?: number;
  }>(),
  {
    sources: () => [],
    limit: 3,
  },
);

const visibleSources = computed(() => (props.sources || []).slice(0, props.limit));
const hiddenCount = computed(() => Math.max(0, (props.sources?.length || 0) - props.limit));
</script>

<template>
  <div v-if="sources?.length" class="flex min-w-0 flex-wrap gap-1">
    <span
      v-for="source in visibleSources"
      :key="`${source.kind}-${source.studyListSlug || source.title}`"
      class="badge badge-ghost badge-sm max-w-44 truncate"
      :title="source.title"
    >
      {{ source.title }}
    </span>
    <span v-if="hiddenCount" class="badge badge-primary badge-soft badge-sm">来自 {{ sources.length }} 个来源</span>
  </div>
</template>
