

# Impressão Clínica gerada por IA no detalhe do paciente + PDF

## Visão Geral

Criar uma seção "Impressão Clínica" na página de detalhe do paciente (dentro do dashboard profissional) que usa IA para interpretar os dados da avaliação mais recente e entregar uma visão integrativa do quadro do paciente — sem abordar tratamento específico. Inclui até 2 objetivos terapêuticos principais. Essa impressão também será incluída no relatório PDF profissional.

## 1. Edge Function — `generate-clinical-impression`

Nova edge function que recebe os dados da avaliação (anamnese, regiões de dor, score, questionários, diagnóstico) e retorna:

```json
{
  "clinicalImpression": {
    "overview": "Texto interpretativo em 3-5 linhas sobre o quadro clínico integrado...",
    "therapeuticObjectives": ["Controle do quadro álgico", "Exposição gradativa à carga"]
  }
}
```

**Prompt da IA:**
- Interpretar o contexto clínico (anamnese, queixa, duração, regiões, score VAS, questionários, diagnóstico)
- Gerar visão integrativa breve (3-5 linhas) sem mencionar exercícios ou abordagens de tratamento
- Fornecer exatamente 2 objetivos terapêuticos principais (escolher entre: controle do quadro álgico, reequilibrar tensões miofasciais, exposição gradativa à carga, mobilidade, controle motor, fortalecimento, estabilização segmentar, modulação da dor)
- Idioma baseado no parâmetro `language`

Usa `LOVABLE_API_KEY` + Lovable AI Gateway, modelo `google/gemini-3-flash-preview`, com tool calling para saída estruturada.

## 2. UI — Seção no PatientEvolutionDashboard

No detalhe do paciente, entre o gráfico de evolução de dor e o mapa de dor comparativo (~linha 822), adicionar um card "Impressão Clínica":

- Ícone `Brain` + título "Impressão Clínica"
- Badge "IA" no canto
- Botão "Gerar" que chama a edge function passando dados da avaliação mais recente com diagnóstico
- Uma vez gerado, exibe o texto `overview` e os 2 objetivos como badges/chips
- Estado salvo no `professional_notes` ou em campo local (via localStorage por assessment ID) para não regenerar toda vez
- Botão "Regenerar" para refazer

**Persistência:** Salvar a impressão clínica no campo `diagnosis` da avaliação (como subcampo `clinicalImpression`) via update no assessment, para que o PDF possa acessar depois.

## 3. PDF — Incluir Impressão Clínica

No `generatePdf.ts`, no fluxo profissional, após o bloco de diagnóstico e antes da anamnese:

- Seção "Impressão Clínica" com fundo suave (primaryLight)
- Texto do overview em itálico
- Dois chips/bullets com os objetivos terapêuticos
- Condicionado a `diagnosis?.clinicalImpression` existir

## Arquivos a criar/alterar

1. `supabase/functions/generate-clinical-impression/index.ts` — nova edge function
2. `src/components/dashboard/PatientEvolutionDashboard.tsx` — seção de impressão clínica no detalhe do paciente
3. `src/utils/generatePdf.ts` — renderizar impressão clínica no PDF profissional

