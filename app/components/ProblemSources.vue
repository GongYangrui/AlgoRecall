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

const expanded = ref(false);
const normalizedSources = computed(() => props.sources || []);
const visibleSources = computed(() => (expanded.value ? normalizedSources.value : normalizedSources.value.slice(0, props.limit)));
const hiddenCount = computed(() => Math.max(0, normalizedSources.value.length - props.limit));

watch(
  () => [normalizedSources.value.length, props.limit],
  () => {
    expanded.value = false;
  },
);
</script>

<template>
  <div v-if="normalizedSources.length" class="flex min-w-0 flex-wrap gap-1">
    <span
      v-for="source in visibleSources"
      :key="`${source.kind}-${source.studyListSlug || source.title}`"
      class="badge badge-ghost badge-sm max-w-44 truncate"
      :title="source.title"
    >
      {{ source.title }}
    </span>
    <button
      v-if="hiddenCount && !expanded"
      class="badge badge-primary badge-soft badge-sm cursor-pointer border-0"
      type="button"
      :aria-label="`展开另外 ${hiddenCount} 个来源`"
      :title="normalizedSources.map((source) => source.title).join('、')"
      @click="expanded = true"
    >
      +{{ hiddenCount }}
    </button>
    <button
      v-else-if="hiddenCount"
      class="badge badge-ghost badge-sm cursor-pointer border-0"
      type="button"
      aria-label="收起来源"
      @click="expanded = false"
    >
      收起
    </button>
  </div>
</template>
