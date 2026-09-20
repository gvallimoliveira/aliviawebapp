/**
 * Editar arte salva não pode gerar arte nova: o instantâneo tem que voltar
 * idêntico, aceitar troca de frase pontual e ignorar código executável.
 */
import { describe, expect, it } from "vitest";
import { sanitizeSnapshotHtml, isArtSnapshot } from "@/pages/studio-pro/artSnapshot";
import { reflowStaticArtwork } from "@/pages/studio/AutoFit";
import { applyArtText, collectEditableNodes, readArtText, setArtEditing } from "@/pages/studio/artTextEdit";

const ART = `<div class="p-6"><h1>O movimento seguinte agora é seu</h1><p>Primeira sessão com plano na mão.</p></div>`;

const mount = (html: string) => {
  const root = document.createElement("div");
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
};

describe("instantâneo da arte salva", () => {
  it("mantém o HTML da arte ao sanitizar", () => {
    expect(sanitizeSnapshotHtml(ART)).toContain("O movimento seguinte agora é seu");
    expect(sanitizeSnapshotHtml(ART)).toContain("Primeira sessão com plano na mão.");
  });

  it("remove script, handlers e contenteditable", () => {
    const dirty = `${ART}<script>alert(1)</script><p onclick="alert(2)" contenteditable="true">oi</p>`;
    const clean = sanitizeSnapshotHtml(dirty);
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("contenteditable");
  });

  it("editar uma frase preserva o resto da arte", () => {
    const root = mount(sanitizeSnapshotHtml(ART));
    const before = readArtText(root);
    applyArtText(root, { ...before, 0: "Seu próximo movimento começa aqui" });
    const after = readArtText(root);
    expect(after[0]).toBe("Seu próximo movimento começa aqui");
    expect(after[1]).toBe(before[1]);
    expect(root.querySelectorAll("h1, p").length).toBe(2);
  });

  it("preserva a palavra verde quando o navegador achata a frase durante a edição", () => {
    const root = mount('<p>Clareza para <span class="text-primary">decidir</span> com segurança.</p>');
    root.id = "accent-art";
    setArtEditing(root, true);
    const paragraph = root.querySelector("p");
    if (paragraph) paragraph.textContent = "Clareza para decidir com seus próprios dados.";
    setArtEditing(root, false);
    expect(root.querySelector(".text-primary")?.textContent).toBe("decidir");
    expect(paragraph?.textContent).toBe("Clareza para decidir com seus próprios dados.");
    root.remove();
  });

  it("mantém o destaque depois da remontagem usada antes de salvar e baixar", () => {
    const first = mount('<p>Dados que ajudam a <span class="text-primary">decidir</span>.</p>');
    first.id = "accent-remount";
    setArtEditing(first, true);
    const paragraph = first.querySelector("p");
    if (paragraph) paragraph.textContent = "Métricas que ajudam a decidir melhor.";
    setArtEditing(first, false);
    const edited = readArtText(first);
    first.remove();

    const remounted = mount('<p>Dados que ajudam a <span class="text-primary">decidir</span>.</p>');
    remounted.id = "accent-remount";
    applyArtText(remounted, edited);
    expect(remounted.querySelector(".text-primary")?.textContent).toBe("decidir");
    expect(remounted.textContent).toBe("Métricas que ajudam a decidir melhor.");
    remounted.remove();
  });

  it("move o destaque quando a palavra original é substituída", () => {
    const root = mount('<p>Clareza para <span class="text-primary">decidir</span>.</p>');
    root.id = "accent-reword";
    setArtEditing(root, true);
    const paragraph = root.querySelector("p");
    if (paragraph) paragraph.textContent = "Organização clínica sem improviso.";
    setArtEditing(root, false);
    expect(root.querySelector(".text-primary")?.textContent).toBe("Organização");
    expect(paragraph?.textContent).toBe("Organização clínica sem improviso.");
    root.remove();
  });

  it("reconhece só instantâneos com slides", () => {
    expect(isArtSnapshot(null)).toBe(false);
    expect(isArtSnapshot({ version: 1, slides: [] })).toBe(false);
    expect(
      isArtSnapshot({ version: 1, format: "1x1", theme: {}, slides: [{ storage_path: "a", width: 1, height: 1 }] }),
    ).toBe(true);
  });

  it("recompõe o HTML salvo no quadro inteiro sem criar bordas de encaixe", () => {
    const root = mount(`
      <div data-studio-autofit-frame="1" style="width:320px;height:400px;overflow:hidden">
        <div data-studio-autofit-content="1" style="width:125%;height:125%;transform:scale(.8)">
          <section style="width:100%;height:100%"><p>Mesma arte</p></section>
        </div>
      </div>
    `);
    reflowStaticArtwork(root);
    const frame = root.querySelector<HTMLElement>('[data-studio-autofit-frame="1"]');
    const content = root.querySelector<HTMLElement>('[data-studio-autofit-content="1"]');
    expect(frame?.style.width).toBe("320px");
    expect(content?.style.transform).toBe("scale(1)");
    expect(content?.style.width).toBe("100%");
    expect(root.textContent).toContain("Mesma arte");
    root.remove();
  });

  it("recompõe também artes antigas salvas antes dos marcadores do AutoFit", () => {
    const root = mount(`
      <div style="width:320px;height:568px;overflow:hidden">
        <div class="origin-top-left" style="width:166.667%;height:166.667%;transform:scale(.6)">
          <section style="width:100%;height:100%"><p>Arte antiga preservada</p></section>
        </div>
      </div>
    `);
    reflowStaticArtwork(root);
    const content = root.querySelector<HTMLElement>(".origin-top-left");
    expect(content?.style.width).toBe("100%");
    expect(content?.style.height).toBe("100%");
    expect(content?.style.transform).toBe("scale(1)");
    expect(root.textContent).toContain("Arte antiga preservada");
    root.remove();
  });

  it("permite editar textos em spans e divs sem incluir assinatura ou decoração", () => {
    const root = mount(`
      <div><span>01</span><div>Amplifica o que ele já faz bem.</div></div>
      <span>Teste na sua operação.</span>
      <div aria-hidden="true"><span>Aliv.iA</span></div>
      <span>→</span>
    `);
    expect(collectEditableNodes(root).map((node) => node.textContent?.trim())).toEqual([
      "01",
      "Amplifica o que ele já faz bem.",
      "Teste na sua operação.",
    ]);
    root.remove();
  });

  it("emite cada rascunho enquanto o usuário digita", () => {
    const root = mount("<div>Texto original</div>");
    let draft: Record<number, string> = {};
    setArtEditing(root, true, (next) => { draft = next; });
    const text = collectEditableNodes(root)[0];
    text.textContent = "Texto preservado";
    text.dispatchEvent(new Event("input", { bubbles: true }));
    expect(draft[0]).toBe("Texto preservado");
    root.remove();
  });
});
