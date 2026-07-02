<script setup lang="ts">
import { BarChart3, BookOpen, CalendarCheck, Import, LogOut, Menu, Sparkles } from "@lucide/vue";
import { authClient } from "../utils/auth-client";

const route = useRoute();
const importModal = ref<{ open: () => void } | null>(null);

const links = [
  { href: "/app", label: "今日复习", icon: CalendarCheck },
  { href: "/problems", label: "题库", icon: BookOpen },
  { href: "/stats", label: "统计", icon: BarChart3 },
];

async function logout() {
  await authClient.signOut();
  await navigateTo("/");
}

function openImportModal() {
  importModal.value?.open();
}
</script>

<template>
  <div class="navbar sticky top-0 z-40 border-b border-base-300/80 bg-base-100/90 px-3 backdrop-blur">
    <div class="navbar-start">
      <div class="dropdown lg:hidden">
        <button class="btn btn-ghost btn-square" type="button" aria-label="打开导航" tabindex="0">
          <Menu class="h-5 w-5" />
        </button>
        <ul class="menu dropdown-content z-50 mt-3 w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow">
          <li v-for="link in links" :key="link.href">
            <NuxtLink :to="link.href">
              <component :is="link.icon" class="h-4 w-4" />
              {{ link.label }}
            </NuxtLink>
          </li>
          <li>
            <button type="button" @click="openImportModal">
              <Import class="h-4 w-4" />
              导入题目
            </button>
          </li>
        </ul>
      </div>
      <NuxtLink to="/app" class="btn btn-ghost gap-2 text-lg font-black">
        <span class="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-content">
          <Sparkles class="h-5 w-5" />
        </span>
        AlgoRecall
      </NuxtLink>
    </div>

    <div class="navbar-center hidden lg:flex">
      <ul class="menu menu-horizontal gap-1">
        <li v-for="link in links" :key="link.href">
          <NuxtLink :to="link.href" :class="{ active: route.path === link.href }">
            <component :is="link.icon" class="h-4 w-4" />
            {{ link.label }}
          </NuxtLink>
        </li>
      </ul>
    </div>

    <div class="navbar-end">
      <button class="btn btn-primary btn-sm mr-2 hidden gap-2 md:inline-flex" type="button" @click="openImportModal">
        <Import class="h-4 w-4" />
        导入题目
      </button>
      <button class="btn btn-ghost btn-sm gap-2" type="button" @click="logout">
        <LogOut class="h-4 w-4" />
        退出
      </button>
    </div>
  </div>
  <ImportProblemModal ref="importModal" />
</template>
