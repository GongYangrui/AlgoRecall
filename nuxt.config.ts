import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineNuxtConfig({
  compatibilityDate: "2026-07-01",
  devtools: { enabled: true },
  app: {
    head: {
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/algo-recall-icon.svg" },
      ],
    },
    pageTransition: {
      name: "page",
      mode: "out-in",
    },
  },
  css: ["~/assets/css/main.css"],
  modules: [],
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            charts: ["echarts", "vue-echarts"],
          },
        },
      },
    },
  },
  alias: {
    "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    betterAuthSecret: process.env.BETTER_AUTH_SECRET,
    betterAuthUrl: process.env.BETTER_AUTH_URL,
    adminEmails: process.env.ADMIN_EMAILS,
    public: {
      appVersion: process.env.APP_VERSION || process.env.GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA || "dev",
    },
  },
  typescript: {
    typeCheck: true,
    strict: true,
  },
});
