import { describe, expect, it } from "vitest";
import { commercialAudienceHooks, prioritizeCommercialAudience, relatedCommercialItem } from "../commercialPriority";
import { buildBrandDna, offerWords } from "../brandDnaKit";
import { buildSegmentContent } from "../brandContent";
import type { BrandAudience } from "../audiences";

const dna = buildBrandDna({ description: "Análise de termografia, ultrassom e ressonância e relatórios comparativos", briefAnswers: { oferta: "Análise de exames de imagem e relatório técnico-funcional", desejo: "Comparar exames e documentar evolução tecidual" } });
const clinic: BrandAudience = {
  id: "gestor", label: "Gestor de clínica", keyword: "Gestão clínica", cta: "Conheça os planos",
  description: "Clínica que precisa padronizar relatórios e acompanhar evolução",
  pains: ["Relatórios sem padrão", "Evolução dispersa em exames"],
  desires: ["Tarjar dados confidenciais", "Padronizar relatórios comparativos de evolução"],
  proof: ["Tarjas sobre identificação", "Relatório comparativo de exames e evolução"],
  hook: "Você que quer tarjar dados", hooks: ["Você que precisa comparar exames de evolução"],
};

describe("prioridade comercial baseada no kit", () => {
  it("prioriza relatório e evolução sobre tarjas sem remover as funções acessórias", () => {
    const ranked = prioritizeCommercialAudience(clinic, dna);
    expect(ranked.desires?.[0]).toBe("Padronizar relatórios comparativos de evolução");
    expect(ranked.proof?.[0]).toBe("Relatório comparativo de exames e evolução");
    expect(ranked.desires).toContain("Tarjar dados confidenciais");
    expect(clinic.desires?.[0]).toBe("Tarjar dados confidenciais");
  });
  it("não usa tarjas como prova de evolução tecidual", () => {
    expect(relatedCommercialItem("Comparar exames de evolução", clinic.proof ?? [])).toBe("Relatório comparativo de exames e evolução");
    expect(relatedCommercialItem("Readiness do atleta", ["Tarjas sobre identificação"])).toBeUndefined();
  });
  it("relaciona prontidão a Readiness, não a qualquer outro escore", () => {
    expect(relatedCommercialItem("Cruzar exames com o escore de prontidão física", ["Graduação Doppler assistida pelo escore de Ohberg", "Integração do questionário de Readiness ao painel"])).toBe("Integração do questionário de Readiness ao painel");
  });
  it("software para fisioterapia continua produto, não atendimento clínico", () => {
    expect(offerWords(buildBrandDna({ description: "Software para clínicas de fisioterapia e reabilitação" })).kind).toBe("produto");
  });
  it("inclui mais de um público com seus próprios convites sem emprestar provas", () => {
    const patient: BrandAudience = { id: "paciente", label: "Paciente", desires: ["Entender imagens na consulta"], proof: ["Imagens explicadas pelo fisioterapeuta"], cta: "Fale com seu fisioterapeuta" };
    const hooks = commercialAudienceHooks([clinic, patient], dna);
    expect(hooks.some((hook) => hook.hook.startsWith("Paciente") && hook.cta === "Fale com seu fisioterapeuta")).toBe(true);
    expect(hooks.filter((hook) => hook.hook.startsWith("Gestor")).every((hook) => hook.cta === "Conheça os planos")).toBe(true);
    expect(hooks.filter((hook) => hook.hook.startsWith("Paciente")).some((hook) => hook.sub?.includes("Tarjas"))).toBe(false);
  });
  it("faz o público ativo usar sua biblioteca, não a de outro público", () => {
    const content = buildSegmentContent({ kit: { name: "Marca de exames", description: dna.description }, audiences: [clinic, { id: "outro", label: "Outro", desires: ["Comprar sapatos"], cta: "Comprar sapatos" }], segment: "gestor", angle: "desejo", variationSeed: "prioridade" });
    expect(content.hooks?.length).toBeGreaterThan(2);
    expect(content.hooks?.some((hook) => hook.cta === "Comprar sapatos")).toBe(false);
    expect(commercialAudienceHooks([clinic], dna)).toEqual(commercialAudienceHooks([clinic], dna));
  });
});