---
name: Evolution Report Depth
description: O relatório de evolução (PRO/Clínica) deve varrer todos os dados clínicos disponíveis, nunca ser um resumo genérico.
type: feature
---

# Relatório de Evolução — profundidade obrigatória

O relatório de evolução (`generate-evolution-summary` + `generateEvolutionPdfBlob`) deve considerar
TODAS as avaliações com diagnóstico do paciente (não apenas primeira e última) e enviar ao modelo:

- anamnese de cada avaliação (queixa, início, evolução, fatores de piora/melhora, nível de atividade,
  tratamentos anteriores, padrão de dor, refinamentos anatômicos, dor por região);
- questionários funcionais com score, interpretação e subescalas;
- testes funcionais;
- dinamometria (`anamnesis_data.strengthTable`) e ADM (`romTable`), formatados via
  `supabase/functions/_shared/objective-tests.ts` (média, melhor, nº de tentativas, CV%,
  assimetria L/R e agonista/antagonista — >10% é déficit relevante, CV >15% é reprodutibilidade ruim);
- evoluções de sessão (`session_notes`, incluindo `observation`).

Saída estruturada com seções obrigatórias: `narrative` (12-20 linhas), `painChange`,
`anamnesisSynthesis`, `questionnaireAnalysis`, `objectiveFindings`, `sessionNotesSynthesis`,
`conclusion` (4-8 linhas) e `recommendation`. Seções sem dado retornam string vazia e não são
impressas no PDF (bloco "Análise Clínica Detalhada"). Nunca inventar valores.

## Exclusão de avaliações

A exclusão de avaliações no painel do profissional usa a RPC `public.delete_assessment_secure`
(security definer): valida permissão (paciente por user_id/e-mail, profissional vinculado, ou
equipe da clínica com papel de gestão) e limpa/desvincula os registros filhos que bloqueavam o
delete (encaminhamentos, programas de exercício, notas, e-mails de follow-up, questionários
pendentes, notas de voz, triagens, agendamentos). Não voltar ao delete direto por RLS.
