import { describe, expect, it } from "vitest";
import { renderStaticPage } from "../../plugins/staticPagesPlugin";

const base = `<html><head><title>Home</title><meta name="description" content="x"><link rel="canonical" href="https://aliviawebapp.com.br" /><meta property="og:url" content="https://aliviawebapp.com.br" /></head><body><div id="root"></div></body></html>`;
const snap = { path: "/clinica", title: "Clínica | Aliv.iA", description: "Agenda e prontuário", text: "Linha 1\n\nTeste <b>" };

describe("static public pages", () => {
  it("points title, canonical and og:url at the page itself", () => {
    const html = renderStaticPage(base, snap);
    expect(html).toContain("<title>Clínica | Aliv.iA</title>");
    expect(html).toContain('<link rel="canonical" href="https://aliviawebapp.com.br/clinica" />');
    expect(html).toContain('<meta property="og:url" content="https://aliviawebapp.com.br/clinica" />');
    expect(html).not.toContain('href="https://aliviawebapp.com.br" />');
  });
  it("exposes the page text escaped inside noscript", () => {
    const html = renderStaticPage(base, snap);
    expect(html).toContain("<noscript><main>");
    expect(html).toContain("Teste &lt;b&gt;");
    expect(html).toContain('<div id="root"></div>');
  });
});
