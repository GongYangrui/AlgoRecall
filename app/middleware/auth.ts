export default defineNuxtRouteMiddleware(async () => {
  try {
    const session = await $fetch("/api/auth/get-session", {
      headers: import.meta.server ? useRequestHeaders(["cookie"]) : undefined,
    });

    if (!session) return navigateTo("/login");
  } catch {
    return navigateTo("/login");
  }
});
