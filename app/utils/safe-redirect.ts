export function safeInternalRedirect(value: unknown, fallback = "/app") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const url = new URL(value, "https://algorecall.local");
    return url.origin === "https://algorecall.local" ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}
