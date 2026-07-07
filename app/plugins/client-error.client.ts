import type { ClientErrorPayload } from "@shared/client-error";

function errorToPayload(error: unknown, fallbackMessage: string): Pick<ClientErrorPayload, "message" | "name" | "stack"> {
  if (error instanceof Error) {
    return {
      message: error.message || fallbackMessage,
      name: error.name,
      stack: error.stack,
    };
  }

  return {
    message: typeof error === "string" ? error : fallbackMessage,
    name: "ClientError",
  };
}

export default defineNuxtPlugin((nuxtApp) => {
  let reporting = false;

  async function reportClientError(error: unknown, componentInfo?: string) {
    if (reporting) return;
    reporting = true;
    try {
      const route = useRoute();
      const config = useRuntimeConfig();
      const payload: ClientErrorPayload = {
        ...errorToPayload(error, "Client error"),
        route: route.fullPath,
        userAgent: navigator.userAgent,
        componentInfo,
        appVersion: String(config.public.appVersion || "dev"),
      };
      await $fetch("/api/logs/client-error", {
        method: "POST",
        body: payload,
      }).catch(() => undefined);
    } finally {
      reporting = false;
    }
  }

  nuxtApp.vueApp.config.errorHandler = (error, _instance, info) => {
    void reportClientError(error, info);
  };

  window.addEventListener("error", (event) => {
    void reportClientError(event.error || event.message, "window.onerror");
  });

  window.addEventListener("unhandledrejection", (event) => {
    void reportClientError(event.reason, "unhandledrejection");
  });
});
