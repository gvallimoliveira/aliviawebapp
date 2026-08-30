import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    /* Os testes do motor criativo geram lotes inteiros de artes (dezenas de
       gerações por caso) e passam dos 5s padrão quando a suíte roda em paralelo. */
    testTimeout: 20000,

  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
