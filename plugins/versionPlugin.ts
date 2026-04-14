import { Plugin } from "vite";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";
import { createHash } from "crypto";

/**
 * Vite plugin that:
 * 1. Generates a unique build hash per build
 * 2. Injects it as VITE_BUILD_HASH env var
 * 3. Writes a /version.json to the output dir
 */
export function versionPlugin(): Plugin {
  let buildHash = "";

  return {
    name: "alivia-version",
    config(_config, { command }) {
      if (command === "build") {
        buildHash = createHash("md5")
          .update(Date.now().toString() + Math.random().toString())
          .digest("hex")
          .slice(0, 12);
      } else {
        buildHash = "__dev__";
      }

      return {
        define: {
          "import.meta.env.VITE_BUILD_HASH": JSON.stringify(buildHash),
        },
      };
    },
    closeBundle() {
      if (buildHash === "__dev__") return;

      const outDir = resolve(process.cwd(), "dist");
      if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true });
      }

      writeFileSync(
        resolve(outDir, "version.json"),
        JSON.stringify({ hash: buildHash, builtAt: new Date().toISOString() }),
      );

      console.log(`[alivia-version] Build hash: ${buildHash}`);
    },
  };
}
