import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineNuxtConfig({
  compatibilityDate: "2026-07-01",
  devtools: { enabled: true },
  app: {
    pageTransition: {
      name: "page",
      mode: "out-in",
    },
  },
  css: ["~/assets/css/main.css"],
  modules: [],
  vite: {
    plugins: [tailwindcss()],
  },
  alias: {
    "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    betterAuthSecret: process.env.BETTER_AUTH_SECRET,
    betterAuthUrl: process.env.BETTER_AUTH_URL,
    adminEmails: process.env.ADMIN_EMAILS,
  },
  typescript: {
    typeCheck: true,
    strict: true,
  },
});
