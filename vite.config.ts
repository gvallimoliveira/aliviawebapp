import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { versionPlugin } from "./plugins/versionPlugin";
import { staticPagesPlugin } from "./plugins/staticPagesPlugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    versionPlugin(),
    staticPagesPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy libraries into separate chunks so they only load
        // when the feature that needs them is opened.
        manualChunks: (id) => {
          // Vite's own preload helper is shared by every lazy route; if rollup
          // parks it inside a feature chunk (pdf/charts), the app shell has to
          // download that whole chunk just to boot.
          if (id.includes("vite/preload-helper") || id.includes("vite/modulepreload")) {
            return "vendor-utils";
          }
          if (!id.includes("node_modules")) return undefined;
          // Shared helper runtimes must live apart, otherwise the app shell
          // ends up importing a tiny helper from a huge feature chunk.
          if (/(tslib|@babel\/runtime|@swc\/helpers|clsx|tailwind-merge|class-variance-authority)\//.test(id)) return "vendor-utils";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("jspdf") || id.includes("html2canvas")) return "pdf";
          if (id.includes("jszip")) return "zip";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("react-easy-crop")) return "image-crop";
          if (id.includes("embla-carousel")) return "carousel";
          if (id.includes("react-day-picker") || id.includes("date-fns")) return "date";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("@supabase")) return "data";
          return undefined;
        },
      },
    },
  },
}));
