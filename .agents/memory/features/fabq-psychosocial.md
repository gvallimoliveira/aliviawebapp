---
name: FABQ / Psychosocial Questionnaires
description: FABQ-Brasil como domínio psicossocial (yellow flags) — quando é sugerido, onde é aplicado, pontuação e uso pela IA.
type: feature
---

# FABQ-Brasil (yellow flags)

Novo domínio `psychosocial` em `src/data/specialtyQuestionnaires.ts`, ao lado de `cardio` e `geri`.

## Instrumentos
- `fabq_brasil` — 16 itens (0–6). Subescalas pontuadas:
  - Atividade Física (FABQ-PA) = itens 2,3,4,5 → 0–24, **corte ≥ 15**
  - Trabalho (FABQ-W) = itens 6,7,9,10,11,12,15 → 0–42, **corte ≥ 34** (29–33 = intermediário)
- `fabq_pa` — versão curta, só os 4 itens de atividade física (0–24).
- Referência: Waddell et al., 1993 · FABQ-Brasil: Abreu et al., Cad. Saúde Pública, 2008.

## Quando aparece
- Não depende de região corporal — depende do **perfil** do paciente.
- Sugerido pela edge function `suggest-specialty-questionnaires` quando há: dor > 3 meses, mecanismo nociplástico/sensibilização central, EVA ≥ 8, ou palavras-chave (medo de mover, cinesiofobia, recidiva, afastamento/atestado, dor relacionada ao trabalho).
- Cap de sugestões: até 3 cardio/geri + no máximo 1 psicossocial.
- Sempre disponível manualmente no `SpecialtyQuestionnairesPanel` (bloco "Perfil psicossocial (yellow flags) — opcional"), mesmo sem sugestão da IA.
- Reavaliação expressa: etapa opcional `psychosocial` (fora do `DEFAULT_REASSESS_STEPS`), respondida pelo paciente em `PsychosocialStep.tsx` nos fluxos `ProfessionalAssessment` e `ClinicAssessment`. No stepper, mapeia para "Questionários".

## Persistência e saídas
- Resultado gravado em `anamnesis_data.specialtyResults` (mesmo formato dos demais especializados, com `score.subscores`).
- PDF: seção "Questionários Complementares" (`renderSpecialtyResultsSection`), antes de ROM/dinamometria; subescala acima do corte sai em vermelho.
- IA (`generate-diagnosis`): bloco `psychosocialBlock` obriga priorizar educação em dor, reasseguramento e exposição gradual em vez de carga agressiva; score nunca entra no campo `hypothesis`; nunca rotular o paciente como catastrofizador em texto voltado ao paciente.
