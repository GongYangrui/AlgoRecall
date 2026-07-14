export default defineNuxtRouteMiddleware(async (to) => {
  try {
    const session = await $fetch("/api/auth/get-session", {
      headers: import.meta.server ? useRequestHeaders(["cookie"]) : undefined,
    });

    if (!session) return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
  } catch {
    return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
  }
});
