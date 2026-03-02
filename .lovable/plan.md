

# Dois Links de Video por Exercicio (PhysioTutors + Shorts)

## Resumo
Cada exercicio no plano de tratamento passara a exibir 2 links de busca no YouTube:
1. **PhysioTutors** -- palavras-chave do exercicio + "physiotutors"
2. **Shorts** -- mesmas palavras-chave + "shorts"

## Mudancas

### 1. Edge Function `generate-treatment/index.ts`
- Alterar o prompt do sistema para instruir a IA a gerar **dois** campos de busca por exercicio:
  - `searchQueryPro`: searchQuery + " physiotutors"
  - `searchQueryShorts`: searchQuery + " shorts"
- Atualizar o JSON de exemplo no prompt para incluir esses dois campos no lugar do campo unico `searchQuery`.

### 2. Frontend `TreatmentPlan.tsx`
- Atualizar a interface `Exercise` para incluir `searchQueryPro?: string` e `searchQueryShorts?: string`.
- Na renderizacao dos links, substituir o link unico por dois links:
  - Primeiro: icone Play + "PhysioTutors" apontando para busca YouTube com `searchQueryPro` (ou fallback: `searchQuery + " physiotutors"`)
  - Segundo: icone Play + "Shorts" apontando para busca YouTube com `searchQueryShorts` (ou fallback: `searchQuery + " shorts"`)
- Manter fallback: se so existir `searchQuery` (planos antigos), derivar os dois links automaticamente adicionando "physiotutors" e "shorts" ao texto.

### 3. Reimplantar a Edge Function
- Deploy automatico apos edicao.

## Resultado
O usuario vera dois botoes de video por exercicio, facilitando acesso a conteudo de referencia (PhysioTutors) e videos curtos (Shorts).
