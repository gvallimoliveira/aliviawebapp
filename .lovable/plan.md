# Corrigir PDF profissional: ordem das seções, blocos indivisíveis e margem das orientações e revisar para confirmar ter abordado da maneira mais eficiente possivel para evitar ajustes adicionais, principalmente de margens. 

## Problemas identificados

1. **Ordem errada** — Hoje: Anamnese → Mapa de Dor → Questionários → Diagnóstico → Tratamento. Correto: **Diagnóstico+Resumo → Anamnese → Mapa de Dor → Escala de Dor → Questionários → Tratamento**.
2. **Subtítulo órfão** — `renderSectionTitle` faz `checkPage` com apenas 14mm, insuficiente para garantir que o conteúdo seguinte (ex: questionários) fique na mesma página. O título pode ficar no final de uma página e o conteúdo na seguinte.
3. **Orientações Gerais ultrapassando margem** — O `splitTextToSize` usa `CONTENT_WIDTH - 6` mas o texto é impresso em `MARGIN + 4`, causando overflow no lado direito.

## Arquivo alterado

`src/utils/generatePdf.ts`

### 1. Reordenar seções em `_buildPdfDoc` (linhas 925-948)

Mover o bloco de Diagnóstico (linhas 950-991) para **antes** da Anamnese, logo após o Patient Info. Adicionar renderização da Escala de Dor (VAS) como seção separada entre Mapa de Dor e Questionários (extrair do `anamnesisData.painScore`). Nova ordem:

```
Patient Info
→ Hipótese Diagnóstica + Resumo + Explicação + Raciocínio
→ Separador
→ Anamnese
→ Mapa de Dor
→ Escala de Dor (VAS) — extraída do painScore
→ Questionários Funcionais
→ Plano de Tratamento
→ Notas do Profissional
→ Disclaimer
```

### 2. Tornar subtítulo + conteúdo bloco indivisível

- Em `renderTestResultsSection`: antes de renderizar o título "Questionários Funcionais", estimar a altura do primeiro questionário (~30mm) e usar `checkPage(doc, y, 30 + 14)` para garantir que título + primeiro item fiquem juntos.
- Em `renderSectionTitle`: aumentar o `needed` mínimo de 14 para receber um parâmetro opcional `contentHeight` que força espaço para o conteúdo seguinte.
- Ajustar `renderSubSection` para calcular a altura total (título + todas as linhas) e fazer um único `checkPage` com esse valor, se couber na página. Se não couber, pelo menos garantir título + 3 primeiras linhas juntos (já faz isso, mas o cálculo atual de `neededForGroup` não inclui o padding correto).

### 3. Corrigir margem das Orientações Gerais (linhas 1104-1121)

Alterar `splitTextToSize` de `CONTENT_WIDTH - 6` para `CONTENT_WIDTH - 10` para compensar o offset `MARGIN + 4` e manter texto dentro das margens.

### 4. Adicionar seção VAS no relatório profissional

Extrair `painScore` de `anamnesisData` e renderizar a barra VAS (mesma lógica usada no relatório básico, linhas 662-728) como seção própria entre Mapa de Dor e Questionários.