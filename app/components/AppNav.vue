<script setup lang="ts">
import { BarChart3, BookOpen, CalendarCheck, Import, ListChecks, LogOut, Menu, PlugZap } from "@lucide/vue";
import { authClient } from "../utils/auth-client";
import { getAvatarInitial, normalizeNickname, shouldShowNavNickname } from "../utils/user-display";

const route = useRoute();
const importModal = ref<{ open: () => void } | null>(null);
const session = authClient.useSession();

const nickname = computed(() => normalizeNickname(session.value.data?.user.name));
const email = computed(() => session.value.data?.user.email?.trim() || "");
const avatarInitial = computed(() => getAvatarInitial(nickname.value));
const showNavNickname = computed(() => shouldShowNavNickname(nickname.value));

const links = [
  { href: "/app", label: "今日复习", icon: CalendarCheck },
  { href: "/problems", label: "题库", icon: BookOpen },
  { href: "/study-lists", label: "题单", icon: ListChecks },
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
        <BrandLogo class="h-9 w-9 shrink-0" />
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
      <details class="dropdown dropdown-end">
        <summary class="btn btn-ghost h-auto min-h-10 gap-2 px-2" :aria-label="nickname ? `打开 ${nickname} 的账户菜单` : '打开账户菜单'">
          <div class="avatar avatar-placeholder shrink-0">
            <div class="w-8 rounded-full bg-neutral text-neutral-content">
              <span class="text-sm font-bold" aria-hidden="true">{{ avatarInitial }}</span>
            </div>
          </div>
          <span v-if="showNavNickname" class="hidden max-w-28 truncate text-sm font-semibold md:block">
            {{ nickname }}
          </span>
        </summary>
        <div class="dropdown-content z-50 mt-3 w-64 rounded-box border border-base-300 bg-base-100 shadow">
          <div class="border-b border-base-300 px-4 py-3">
            <p class="break-words text-sm font-semibold text-base-content">
              {{ nickname || "未设置昵称" }}
            </p>
            <p v-if="email" class="mt-1 break-all text-xs text-base-content/60">
              {{ email }}
            </p>
          </div>
          <ul class="menu p-2">
            <li>
              <NuxtLink to="/settings/extensions">
                <PlugZap class="h-4 w-4" />
                浏览器扩展
              </NuxtLink>
            </li>
            <li>
              <button type="button" @click="logout">
                <LogOut class="h-4 w-4" />
                退出登录
              </button>
            </li>
          </ul>
        </div>
      </details>
    </div>
  </div>
  <ImportProblemModal ref="importModal" />
</template>
