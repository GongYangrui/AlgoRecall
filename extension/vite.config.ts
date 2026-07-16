import { defineConfig, type Plugin } from "vite";

const PRODUCTION_API = "https://algorecall.rayspace.top";
const DEVELOPMENT_API = "http://localhost:3000";

export function createManifest(apiOrigin: string) {
  return {
    manifest_version: 3,
    name: "AlgoRecall for LeetCode",
    description: "在 LeetCode 任意页面查看今日复习，并在题目页直接记录结果。",
    version: "0.1.0",
    permissions: ["storage"],
    host_permissions: [`${apiOrigin}/*`],
    background: { service_worker: "background.js", type: "module" },
    content_scripts: [
      {
        matches: ["https://leetcode.cn/*", "https://leetcode.com/*"],
        js: ["content.js"],
        run_at: "document_idle",
      },
    ],
  };
}

function manifestPlugin(apiOrigin: string): Plugin {
  return {
    name: "algorecall-manifest",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "manifest.json", source: JSON.stringify(createManifest(apiOrigin), null, 2) });
    },
  };
}

export default defineConfig(({ mode }) => {
  const apiOrigin = mode === "development" ? DEVELOPMENT_API : PRODUCTION_API;
  return {
    define: { __ALGO_RECALL_API_ORIGIN__: JSON.stringify(apiOrigin) },
    plugins: [manifestPlugin(apiOrigin)],
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: mode === "development",
      rollupOptions: {
        input: { background: "src/background.ts", content: "src/content.ts" },
        output: { entryFileNames: "[name].js", chunkFileNames: "chunks/[name]-[hash].js" },
      },
    },
  };
});
