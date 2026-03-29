import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(root, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setupTests.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/components/Table/**/*.{ts,tsx}",
        "src/components/Markdown/**/*.{ts,tsx}",
        "src/config/**/*.ts",
        "src/utils/**/*.ts",
        "src/api/**/*.ts",
        "src/test/**/*.ts",
      ],
      exclude: ["**/*.test.{ts,tsx}", "**/ColumnSettingsModal.tsx"],
    },
  },
});
