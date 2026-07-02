<script setup lang="ts">
import { difficultyLabel, statusLabel } from "@shared/problems";

defineProps<{
  difficulty?: string;
  status?: string;
}>();

function difficultyClass(difficulty = "") {
  const key = difficulty.toLowerCase();
  if (key === "easy") return "badge-success";
  if (key === "hard") return "badge-error";
  return "badge-warning";
}

function statusClass(status = "") {
  if (status === "mastered") return "badge-success";
  if (status === "learning") return "badge-warning";
  if (status === "reviewing") return "badge-info";
  return "badge-ghost";
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <span v-if="difficulty" class="badge badge-soft" :class="difficultyClass(difficulty)">
      {{ difficultyLabel(difficulty) }}
    </span>
    <span v-if="status" class="badge badge-soft" :class="statusClass(status)">
      {{ statusLabel(status) }}
    </span>
  </div>
</template>
