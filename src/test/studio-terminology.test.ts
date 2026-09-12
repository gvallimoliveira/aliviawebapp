import { describe, expect, it } from "vitest";
import {
  applyTerms,
  deprotocol,
  isPatientVoice,
  preAssessmentTerms,
  selfAssessmentTerms,
} from "@/pages/studio/terminology";

import { WORLDS } from "@/pages/studio/content";
import type { WorldContent } from "@/pages/studio/content";

const collect = (value: unknown, out: string[] = []): string[] => {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collect(v, out));
  else if (value && typeof value === "object") Object.values(value as Record<string, unknown>).forEach((v) => collect(v, out));
  return out;
};

const strings = (content: WorldContent) => collect(content);

describe("Regra 1 — autoavaliação no mundo do paciente", () => {
  it("prefixa avaliação do próprio usuário", () => {
    expect(selfAssessmentTerms("Faça sua avaliação agora")).toBe("Faça sua autoavaliação agora");
    expect(selfAssessmentTerms("Avaliação guiada em minutos")).toBe("Autoavaliação guiada em minutos");
    expect(selfAssessmentTerms("Duas avaliações comparadas")).toBe("Duas autoavaliações comparadas");
  });

  it("preserva avaliação de terceiro e reavaliação", () => {
    expect(selfAssessmentTerms("Procure avaliação médica")).toBe("Procure avaliação médica");
    expect(selfAssessmentTerms("Se o caso pedir avaliação presencial")).toBe("Se o caso pedir avaliação presencial");
    expect(selfAssessmentTerms("marcar uma avaliação com um fisioterapeuta")).toBe(
      "marcar uma avaliação com um fisioterapeuta",
    );
    expect(selfAssessmentTerms("Reavaliação em 4 semanas")).toBe("Reavaliação em 4 semanas");
    expect(selfAssessmentTerms("Autoavaliação pronta")).toBe("Autoavaliação pronta");
  });

  it("acervo do paciente não fala de avaliação solta", () => {
    const bad = strings(WORLDS.paciente).filter((text) =>
      /(^|[^a-zà-ú])avalia[çc][ãa](o|ões|oes)/i.test(text) &&
      !/avalia[çc][ãa]o\s+(m[eé]dica|presencial|cl[íi]nica|fisioterap[êe]utica|com\s+|em\s+consult[óo]rio|de\s+um)/i.test(text) &&
      !/(procur|busc|marc|agend|indic|encaminh)\w*\s+(uma\s+|a\s+)?avalia/i.test(text),
    );
    expect(bad).toEqual([]);
  });

  it("mundos profissionais mantêm avaliação", () => {
    for (const world of ["pro", "clinica", "academico"] as const) {
      const all = strings(WORLDS[world]).join(" ");
      expect(/autoavalia/i.test(all)).toBe(false);
    }
  });

  it("reconhece público de paciente e sub-nichos clínicos", () => {
    expect(isPatientVoice("Paciente com dor crônica")).toBe(true);
    expect(isPatientVoice("Pós-operatório de joelho")).toBe(true);
    expect(isPatientVoice("Público 60+")).toBe(true);
    expect(isPatientVoice("Esportista amador")).toBe(true);
    expect(isPatientVoice("Dono de clínica de fisioterapia")).toBe(false);
    expect(isPatientVoice("Fisioterapeuta autônomo")).toBe(false);
    expect(isPatientVoice("Clínica que atende dor crônica")).toBe(false);
    expect(isPatientVoice("Professor com alunos que tratam dor lombar")).toBe(false);
  });

  it("frase com ator profissional nunca vira autoavaliação", () => {
    const clinic = "Clínica que não padroniza avaliação não escala";
    expect(selfAssessmentTerms(clinic)).toBe(clinic);
    expect(applyTerms(clinic, { patientVoice: true })).toBe(clinic);
    const pro = "Fisioterapeuta que repete a mesma avaliação em todo paciente";
    expect(applyTerms(pro, { patientVoice: true })).toBe(pro);
  });
});

describe("Regra 3 — link enviado ao paciente é pré-avaliação", () => {
  it("usa pré-avaliação quando fala do link/convite", () => {
    expect(preAssessmentTerms("Envie o link de avaliação antes da consulta")).toBe(
      "Envie o link de pré-avaliação antes da consulta",
    );
    expect(applyTerms("O paciente chega preenchido: avaliação enviada por link")).toBe(
      "O paciente chega preenchido: pré-avaliação enviada por link",
    );
  });

  it("não toca avaliação comum nem reavaliação", () => {
    expect(preAssessmentTerms("Avaliação padronizada da equipe")).toBe("Avaliação padronizada da equipe");
    expect(preAssessmentTerms("Reavaliação enviada por link")).toBe("Reavaliação enviada por link");
    expect(preAssessmentTerms("Link do plano de exercícios")).toBe("Link do plano de exercícios");
  });
});


describe("Regra 2 — a marca nunca afirma ter protocolo", () => {
  it("troca afirmação por alternativa aprovada", () => {
    expect(deprotocol("Cada caso ganha um protocolo")).toBe("Cada caso ganha um raciocínio clínico");
    expect(deprotocol("Um protocolo para organizar a rotina")).toBe("Um método estruturado para organizar a rotina");
    expect(deprotocol("Protocolo com o próximo passo claro")).toBe("Direcionamento com o próximo passo claro");
  });

  it("preserva o uso crítico (negar protocolo)", () => {
    const critical = "4 sinais de que um caso pede mais que protocolo";
    expect(deprotocol(critical)).toBe(critical);
    expect(deprotocol("protocolo de prateleira não conhece o seu paciente")).toBe(
      "protocolo de prateleira não conhece o seu paciente",
    );
  });

  it("nenhum mundo afirma protocolo", () => {
    for (const world of ["pro", "paciente", "clinica", "academico"] as const) {
      const bad = strings(WORLDS[world]).filter(
        (text) => /protocolo/i.test(text) && deprotocol(text) !== text,
      );
      expect(bad).toEqual([]);
    }
  });

  it("applyTerms sem patientVoice não mexe em avaliação", () => {
    expect(applyTerms("Avaliação padronizada da equipe")).toBe("Avaliação padronizada da equipe");
    expect(applyTerms("Avaliação padronizada da equipe", { patientVoice: true })).toBe(
      "Autoavaliação padronizada da equipe",
    );
  });
});
