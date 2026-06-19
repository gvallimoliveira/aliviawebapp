## Objetivo

Permitir registrar **dinamometria (força muscular)** em **kgf** dentro de cada avaliação e visualizá-la consolidada no prontuário do paciente, alimentando o raciocínio da IA (impressão clínica, diagnóstico, tratamento).

## 1. Modelo de dados (sem nova tabela)

A dinamometria entra como mais um bloco dentro do JSON `anamnesis_data` das avaliações — mesmo padrão já usado para ADM (`romTable`). Isso significa:

- Novo campo: `anamnesis_data.strengthTable: Array<{ movement: string; leftValue: string; rightValue: string; unit: "kgf" }>`
- Histórico no prontuário = agregação das `strengthTable` de todas as avaliações daquele paciente (mesma lógica que já é feita para ADM e mapa de dor).
- **Não exige migration** — só evolução de schema do JSON.

## 2. Componente `StrengthTable.tsx` (novo)

Espelha `RomTable.tsx`, mas focado em força:

- Cabeçalho: "Dinamometria — Força Muscular (kgf)"
- Colunas: Movimento testado / Esquerda (kgf) / Direita (kgf)
- Inputs numéricos com `inputMode="decimal"` (aceita "32.5")
- Sugestões rápidas (Preensão manual, Flexão de cotovelo, Extensão de joelho, Abdução de ombro, Dorsiflexão, etc.)
- Cálculo automático de **assimetria %** por linha (badge colorido: ≤10% verde, 11-20% âmbar, >20% vermelho) — referência clínica usual.
- Layout mobile idêntico ao ADM corrigido: label em cima, valores lado a lado embaixo.
- Variante readOnly para o PDF/prontuário.

## 3. Botão de upload + extração por IA

Acima da tabela editável: botão "Importar de imagem/PDF":

1. Aceita `image/*` e `application/pdf` (máx. 10MB).
2. Converte para base64, envia para nova Edge Function `extract-dynamometry`.
3. Função chama `google/gemini-2.5-flash` via Lovable AI Gateway com schema estruturado (`Output.object`) pedindo `[{movement, leftValue, rightValue, unit}]`.
4. Resposta é colocada em estado local com badge "Extraído por IA — revise antes de salvar"; usuário pode editar/remover linhas antes de confirmar.
5. Skeleton clínico rotativo durante a extração ("Lendo arquivo…", "Identificando movimentos…", "Tabelando valores…") — mesmo padrão do `ClinicalThinkingSkeleton`.

A imagem/PDF **não é persistida** (mesma decisão tomada para áudio): só o texto extraído entra no prontuário. Mantém custo de storage zero e evita risco LGPD.

## 4. Onde aparece

**Dentro da avaliação (entrada):**
- `src/pages/Assessment.tsx` (autoavaliação premium)
- `src/pages/ClinicAssessment.tsx`
- `src/pages/ProfessionalAssessment.tsx`
- `src/components/dashboard/ManualAssessmentModal.tsx`

Posição: logo após o bloco de ADM (RomTable), antes de salvar a anamnese.

**No prontuário (visualização):**
- `src/components/dashboard/patient-evolution/PatientDetailView.tsx`
- Novo card "Dinamometria — Histórico" inserido **antes** de `<PatientFilesSection>` (linha ~791).
- Mostra: tabela consolidada da última avaliação + mini gráfico de evolução por movimento (linha) quando houver ≥2 medições.

**No PDF:**
- `src/utils/generatePdf.ts`: nova `renderStrengthTableSection`, chamada após `renderRomTableSection` (~linha 1718), respeitando margem 158mm e proteção de título contra órfão.

## 5. Integração com IA clínica

Atualizar prompts para incluir a `strengthTable` como insumo:

- `supabase/functions/generate-diagnosis/index.ts`: adicionar bloco "DADOS DE DINAMOMETRIA" no contexto, com instrução para interpretar assimetrias >20% como sinal de inibição/fraqueza no D.I.F.I.
- `supabase/functions/generate-treatment/index.ts`: usar valores para calibrar carga inicial das fases STEPS (3 a 6).
- `supabase/functions/generate-clinical-impression/index.ts`: comparar dinamometria entre avaliações na narrativa de evolução.

## 6. Tradução

Strings novas em `src/locales/pt.json | en.json | es.json` sob `assessment.strength.*` (title, subtitle, columns, suggestions, importButton, extractingHint, asymmetryBadge, etc.).

## 7. Atualizar página de Suporte

Conforme regra de manutenção: `src/pages/Support.tsx` e `src/pages/ClinicSupport.tsx` ganham parágrafo curto sobre o novo campo de dinamometria nos 3 idiomas.

---

## Detalhes técnicos

- **Edge Function `extract-dynamometry`** (nova): `verify_jwt = false` (padrão Lovable), valida body com Zod, multimodal via `image_url`/`file` no payload chat-completions (Gemini), schema enxuto via `Output.object` para evitar "too many states", fallback de modelos via `_shared/ai-fallback.ts`. Trata 402/429 com mensagens claras na UI.
- **Tipos**: `RomRow` em `RomTable.tsx` é reaproveitável conceitualmente; criaremos `StrengthRow = { movement; leftValue; rightValue; unit }` num arquivo dedicado para clareza semântica.
- **Compat retroativa**: avaliações antigas sem `strengthTable` continuam funcionando — UI só esconde o card quando array vazio.
- **Assimetria %**: `Math.abs(L-R) / Math.max(L,R) * 100`, calculada em runtime, não persistida.

## Fora do escopo

- Tabela dedicada no banco para histórico longitudinal independente das avaliações (pode virar evolução futura se você quiser registrar dinamometria fora de avaliações formais).
- Múltiplas unidades além de kgf (mantemos kgf fixo conforme sua decisão).
- Persistir o arquivo original — só extraímos os valores.
