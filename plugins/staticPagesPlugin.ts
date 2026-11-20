import fs from "fs";
import path from "path";
import type { Plugin } from "vite";

/**
 * Writes dist/<route>/index.html for public pages with their own head tags
 * and a <noscript> copy of the page text, so crawlers that skip JavaScript
 * (WhatsApp, LinkedIn, AI readers) see the right title and content.
 * The React app still boots identically from the same bundle.
 */
interface Snapshot { path: string; title: string; description: string; text: string }
const SITE = "https://aliviawebapp.com.br";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderStaticPage(html: string, s: Snapshot): string {
  const url = `${SITE}${s.path === "/" ? "" : s.path}`;
  const set = (re: RegExp, tag: string) => (re.test(html) ? (html = html.replace(re, tag)) : (html = html.replace("</head>", `    ${tag}\n  </head>`)));
  set(/<title>[\s\S]*?<\/title>/, `<title>${esc(s.title)}</title>`);
  set(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(s.description)}">`);
  set(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />`);
  set(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`);
  set(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(s.title)}" />`);
  set(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(s.description)}" />`);
  set(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(s.title)}" />`);
  set(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${esc(s.description)}" />`);
  const body = s.text.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("\n");
  return html.replace(/<body([^>]*)>/, `<body$1>\n<noscript><main><h1>${esc(s.title)}</h1>\n${body}</main></noscript>`);
}

export function staticPagesPlugin(): Plugin {
  let outDir = "dist";
  return {
    name: "alivia-static-pages",
    apply: "build",
    configResolved(c) { outDir = path.resolve(c.root, c.build.outDir); },
    closeBundle() {
      const indexPath = path.join(outDir, "index.html");
      const file = path.resolve(__dirname, "../seo/page-snapshots.json");
      if (!fs.existsSync(indexPath) || !fs.existsSync(file)) return;
      const base = fs.readFileSync(indexPath, "utf8");
      for (const s of JSON.parse(fs.readFileSync(file, "utf8")) as Snapshot[]) {
        const target = s.path === "/" ? indexPath : path.join(outDir, s.path, "index.html");
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, renderStaticPage(base, s));
      }
    },
  };
}
