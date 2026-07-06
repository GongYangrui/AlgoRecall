import { logError } from "../utils/logger";

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("error", async (error: unknown, { event }: { event: unknown }) => {
    const err = error instanceof Error ? error : new Error(String(error));
    const requestId = (event as Record<string, unknown> | undefined)?.context?.requestId as string | undefined;
    const ev = event as { path?: string; method?: string; node?: { req?: { url?: string } } } | undefined;
    const route = ev?.path || ev?.node?.req?.url || "";
    await logError("server.unhandled_error", {
      message: err.message,
      error: err,
      requestId,
      route,
      method: ev?.method,
    });
  });
});
