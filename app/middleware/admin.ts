// @ts-nocheck - Nuxt 4 type checker has a known stack depth issue with route middleware inference
export default defineNuxtRouteMiddleware(async () => {
  try {
    const session = (await $fetch("/api/auth/get-session", {
      headers: import.meta.server ? useRequestHeaders(["cookie"]) : undefined,
    })) as { user?: { role?: string } } | null;

    if (!session?.user || session.user.role !== "admin") {
      navigateTo("/login");
    }
  } catch {
    navigateTo("/login");
  }
});
