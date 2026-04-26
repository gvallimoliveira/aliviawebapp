import { Plugin } from "vite";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { createHash } from "crypto";

/**
 * Vite plugin that:
 * 1. Generates a unique build hash per build
 * 2. Injects it as VITE_BUILD_HASH env var
 * 3. Writes a /version.json to the output dir
 *
 * If a `public/version-extras.json` file exists at build time, its keys are
 * merged into the final `version.json`. This is how the team can flag a
 * release as needing a PWA shortcut reinstall (see `requiresReinstall`),
 * provide release notes, etc — without changing the plugin itself.
 *
 * Example public/version-extras.json:
 * {
 *   "requiresReinstall": true,
 *   "reinstallReason": "Atualizamos como o app fica salvo no celular...",
 *   "releaseNotes": "Modo offline + comparativo por região"
 * }
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

      // Merge optional extras (requiresReinstall, releaseNotes, etc).
      let extras: Record<string, unknown> = {};
      try {
        const extrasPath = resolve(process.cwd(), "public", "version-extras.json");
        if (existsSync(extrasPath)) {
          extras = JSON.parse(readFileSync(extrasPath, "utf8"));
        }
      } catch (err) {
        console.warn("[alivia-version] Failed to read version-extras.json", err);
      }

      const payload = {
        hash: buildHash,
        builtAt: new Date().toISOString(),
        ...extras,
      };

      writeFileSync(resolve(outDir, "version.json"), JSON.stringify(payload));

      console.log(`[alivia-version] Build hash: ${buildHash}`, extras);
    },
  };
}
