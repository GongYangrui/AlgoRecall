import { assertRateLimit } from "../utils/rate-limit";

export default defineEventHandler(async (event) => {
  if (event.method !== "POST") return;

  if (event.path.startsWith("/api/auth/sign-in/email")) {
    await assertRateLimit(event, { bucket: "auth.sign_in", limit: 10, windowMs: 60_000 });
  }

  if (event.path.startsWith("/api/auth/sign-up/email")) {
    await assertRateLimit(event, { bucket: "auth.sign_up", limit: 5, windowMs: 60_000 });
  }
});
