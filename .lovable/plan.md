

# Padronizar Exibição dos Questionários: Layout Idêntico ao da Imagem

## Contexto

A imagem mostra o layout dos resultados dos questionários no `QuestionnaireStep.tsx` (tela de resultados ao finalizar os questionários). Este é o layout de referência:
- Card com borda arredondada
- Nome abreviado (bold) + nome completo (muted) à esquerda, percentual grande e colorido à direita
- Interpretação de severidade colorida
- Grid 2 colunas com subscale scores (label: **valor%**)
- Nota de escala no rodapé (italic, muted)

## Locais que precisam ser modificados

### 1. Página de detalhes da avaliação (`src/pages/AssessmentView.tsx`, linhas ~440-498)
**Atual:** Cards com fundo `bg-muted/30`, progress bar horizontal, sem grid de subscales bonito.
**Alvo:** Substituir pelo mesmo layout do `QuestionnaireStep.tsx` — Card com `rounded-xl`, percentual grande à direita, interpretação colorida, grid 2 colunas de subscales, nota de escala.

### 2. Página do paciente no painel profissional (`src/components/dashboard/PatientEvolutionDashboard.tsx`, linhas ~1245-1266)
**Atual:** Layout compacto com progress bar `h-1.5`, badge de severidade pequeno, sem subscales visíveis.
**Alvo:** Substituir pelo mesmo card layout — porém levemente mais compacto para caber na lista de avaliações. Manter o nome abreviado + full name, percentual grande, interpretação, grid de subscales e nota de escala.

### 3. PDFs Premium e Profissional (`src/utils/generatePdf.ts`, linhas ~469-607)
**Atual:** Layout simples com nome + porcentagem na mesma linha, progress bar fina, apenas top 3 limitações.
**Alvo:** Redesenhar para espelhar o card visual:
- Caixa arredondada com borda fina para cada questionário
- Nome abreviado (bold, maior) + nome completo abaixo
- Percentual grande no canto superior direito da caixa
- Interpretação de severidade com cor
- Grid 2 colunas com TODOS os subscale scores (não apenas top 3)
- Nota de escala no rodapé da caixa

## Componente reutilizável (UI)

Criar um componente `QuestionnaireResultCard.tsx` em `src/components/assessment/` para evitar duplicação entre `QuestionnaireStep.tsx`, `AssessmentView.tsx` e `PatientEvolutionDashboard.tsx`. Props:
- `result: QuestionnaireResult`
- `questionnaireDef: QuestionnaireDefinition`
- `language: string`
- `compact?: boolean` (para uso no dashboard profissional)

## Arquivos a alterar

1. **`src/components/assessment/QuestionnaireResultCard.tsx`** — novo componente reutilizável
2. **`src/components/assessment/QuestionnaireStep.tsx`** — usar o novo componente
3. **`src/pages/AssessmentView.tsx`** — substituir bloco de questionários pelo novo componente
4. **`src/components/dashboard/PatientEvolutionDashboard.tsx`** — substituir bloco compacto pelo novo componente (com `compact`)
5. **`src/utils/generatePdf.ts`** — redesenhar seção de questionários no PDF para espelhar o card visual com caixa, grid completo de subscales e nota de escala

## Ordem de execução

1. Criar `QuestionnaireResultCard.tsx`
2. Refatorar `QuestionnaireStep.tsx` para usá-lo
3. Aplicar em `AssessmentView.tsx`
4. Aplicar em `PatientEvolutionDashboard.tsx`
5. Redesenhar no `generatePdf.ts`
6. Revisar visualmente todos os pontos de uso

