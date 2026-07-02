import { createAuthClient } from "better-auth/vue";

export const authClient = createAuthClient({
  baseURL: typeof window === "undefined" ? undefined : window.location.origin,
});

export const { signIn, signOut, signUp, useSession } = authClient;
