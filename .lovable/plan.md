## Objetivo

Reduzir ruído clínico em pacientes poliqueixosos no link de pré-avaliação (clínica e profissional), orientando o foco, limitando questionários, capturando contexto adicional e melhorando o feedback visual do botão Finalizar.

## 1. Orientação "foque na queixa principal"

**Onde aparece:**
- `WelcomeStep.tsx` (modes `professional` e `premium`/`basic`): novo card de aviso âmbar logo abaixo dos 3 passos, com ícone `AlertCircle`:
  > "Se você tem mais de uma queixa de dor, foque nas mais relevantes ou que surgiram nos últimos 12 meses. Dores antigas e sem relação direta podem confundir a análise."
- `PainMap.tsx`: lembrete compacto (mesmo tom âmbar, menor) acima do botão de vistas:
  > "Selecione apenas as regiões da(s) queixa(s) atual(is). Evite marcar dores antigas sem relação."

Traduções em `pt.json` / `en.json` / `es.json`.

## 2. Limite inteligente de questionários (máx. 3)

**Lógica nova em `QuestionnaireStep.tsx`** (recebe `painScoresPerRegion` via prop nova vinda de `Assessment.tsx` → `anamnesisData.painScoresPerRegion`):

1. Pega `getApplicableQuestionnaires(painRegions)`.
2. Para cada questionário, calcula `regionScore = max(painScoresPerRegion[r]) para r in q.regionMapping`. Fallback: `painScore` geral.
3. Ordena questionários por `regionScore` desc.
4. Mantém os **2 primeiros como obrigatórios**.
5. O **3º só entra se** o flag `extraQuestionnaireRegions` (de Anamnese, ver §3) indicar uma região coberta por algum questionário restante. Nesse caso adiciona o questionário de maior score dessa região.
6. Demais questionários são descartados (não exibidos, não calculados).

Mostrar pequeno banner no topo: "Priorizamos os questionários das regiões com maior dor (X e Y)" para transparência.

## 3. Captura de "limitação funcional relevante" + IA

**Onde:** novo passo curto entre Anamnese e Questionário (ou último passo dentro de `AnamnesisForm`, condicional a `painRegions.length >= 3`).

- Textarea: "Há alguma região com dor mais baixa que ainda assim te limita muito (trabalho, esporte, sono)? Descreva brevemente."
- Edge function leve **nova** `detect-functional-limitation`:
  - Input: texto livre + lista de `painRegions` + `painScoresPerRegion`.
  - Modelo: `google/gemini-2.5-flash-lite` (rápido/barato).
  - Output JSON: `{ "regions": ["lower_back", ...] }` — apenas regiões já presentes em `painRegions` com score < 5 que o texto indicou impacto funcional.
  - Aplica o protocolo de extração JSON em 4 camadas (regra do projeto).
- Resultado passado como `extraQuestionnaireRegions: string[]` para `QuestionnaireStep`.
- Se texto vazio ou IA não devolver nada: segue só com 2 questionários.

Texto também é salvo em `anamnesisData.functionalLimitationNote` para constar no prontuário/PDF.

## 4. Campo livre antes de Finalizar (tela própria)

Novo step `final_notes` em `Assessment.tsx`, entre `functional_tests` e `loading`:

- Layout limpo: ícone `MessageSquare`, título "Algo mais que devemos saber?", textarea opcional (máx 600 chars) + botão **Finalizar e gerar análise**.
- Conteúdo sobrescreve/popula `additionalInfo` existente (já consumido por `generateDiagnosis` no parâmetro `extraInfo`).
- Botão **Voltar** retorna a `functional_tests`.

`handleTestsComplete` agora vai para `setStep("final_notes")` (premium/professional). Modo `basic` mantém fluxo atual.

## 5. Feedback visual do Finalizar (anti duplo-clique)

No novo step `final_notes` e no botão "Finalizar Testes" de `FunctionalTests.tsx`:

- Usar estado local `isSubmitting`.
- Ao clicar:
  - `disabled = true`
  - Trocar label para "Processando sua avaliação..." + `<Loader2 className="animate-spin" />`
  - Adicionar barra de progresso indeterminada (componente `Progress` com animação CSS shimmer) abaixo do botão
  - Microcopy: "Isso pode levar até 20 segundos. Não feche a página."
- Como a transição para o step `loading` já ocorre, o disable + spinner garantem que cliques repetidos no instante anterior à mudança de tela não disparem múltiplas chamadas.

Adicionalmente, blindar `generateDiagnosis` em `Assessment.tsx` com guard: se já foi disparado (ref `inFlightRef.current = true`), ignora reentradas.

## 6. Páginas de suporte

Conforme regra do projeto, atualizar `Support.tsx`, `ClinicSupport.tsx` + `pt/en/es.json` com nota curta sobre: foco em queixa principal, limite de 3 questionários priorizados, campo de observações finais.

## Detalhes técnicos

**Arquivos editados:**
- `src/pages/Assessment.tsx` — novo step `final_notes`, `inFlightRef`, prop `painScoresPerRegion` para `QuestionnaireStep`, prop `extraQuestionnaireRegions`.
- `src/components/assessment/WelcomeStep.tsx` — alerta âmbar de foco.
- `src/components/assessment/PainMap.tsx` — lembrete compacto.
- `src/components/assessment/AnamnesisForm.tsx` — campo "limitação funcional" + chamada à edge function.
- `src/components/assessment/QuestionnaireStep.tsx` — lógica de priorização (max 3, 2 obrigatórios + 1 opcional via flag).
- `src/components/assessment/FunctionalTests.tsx` — feedback visual no Finalizar (caso `basic`).
- `src/locales/pt.json`, `en.json`, `es.json`.
- `src/pages/Support.tsx`, `src/pages/ClinicSupport.tsx`.

**Arquivos criados:**
- `supabase/functions/detect-functional-limitation/index.ts` (CORS + Lovable AI Gateway).

**Sem migration** (campos novos vivem apenas no JSON `anamnesis_data`).

**Resgate dos 3 cards já vazios da Neon:** fora do escopo desta tarefa (a correção do filtro já foi aplicada; os dados existem). Se quiser, posso fazer um varredor pós-implementação para confirmar.

## Fora de escopo

- Reescrita do prompt da IA de diagnóstico para considerar `functionalLimitationNote` (posso fazer em PR seguinte se desejar).
- Mudanças no PDF para destacar nota funcional separada.
