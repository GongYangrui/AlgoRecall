<script setup lang="ts">
import { difficultyLabel } from "@shared/problems";

defineProps<{
  difficulty?: string;
}>();

function difficultyClass(difficulty = "") {
  const key = difficulty.toLowerCase();
  if (key === "easy") return "badge-success";
  if (key === "hard") return "badge-error";
  return "badge-warning";
}

</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <span v-if="difficulty" class="badge badge-soft" :class="difficultyClass(difficulty)">
      {{ difficultyLabel(difficulty) }}
    </span>
  </div>
</template>
