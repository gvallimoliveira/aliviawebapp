

# Correção de Margens e Quebra de Linha em Todos os PDFs

## Problema
Textos longos (orientações gerais, recomendações, nomes de exercícios, bullets do upsell, etc.) ultrapassam a margem direita do PDF. A referência de largura máxima é a caixa do nome do paciente: `CONTENT_WIDTH` (170mm), com texto começando em `MARGIN + 6` e terminando em `MARGIN + CONTENT_WIDTH - 6` — largura útil de ~158mm.

## Causa raiz
Vários locais usam `doc.text()` direto sem `splitTextToSize`, ou usam `CONTENT_WIDTH` como largura mas posicionam o texto com padding, fazendo o texto exceder a margem direita.

## Correções no arquivo `src/utils/generatePdf.ts`

### 1. Definir constante de largura útil máxima
Criar `const TEXT_MAX_WIDTH = CONTENT_WIDTH - 12` (equivalente ao espaço interno da caixa do paciente: 6mm de padding em cada lado). Usar essa constante como referência máxima para todo `splitTextToSize`.

### 2. Locais específicos a corrigir

**a) `renderSubSection`** (linha 1383):
- Mudar `splitTextToSize(body, CONTENT_WIDTH)` → `splitTextToSize(body, TEXT_MAX_WIDTH)`

**b) Upsell bullets** (linhas 902-904):
- Aplicar `splitTextToSize` nos bullets que hoje são renderizados com `doc.text(b, ...)` sem quebra

**c) Exercise name + category badge** (linhas 1233-1239):
- O nome do exercício + badge pode exceder a margem. Aplicar `splitTextToSize` no nome e posicionar o badge na linha seguinte ou truncar se necessário

**d) Sets/Reps/Frequency** (linha 1254):
- Aplicar `splitTextToSize` na string concatenada `${ex.sets} × ${ex.reps} | ${ex.frequency}`

**e) Questionnaire interpretation** (linha 503):
- Aplicar `splitTextToSize` no texto de interpretação

**f) Test results name:value** (linhas 621-625):
- Aplicar `splitTextToSize` no valor do resultado

**g) Clinical impression therapeutic objectives** (linhas 1114-1118):
- Os badges de objetivos podem exceder a largura — já são badges curtos, mas validar

**h) Professional Notes** (linha 1296):
- Já usa `splitTextToSize` com `CONTENT_WIDTH - 12` — OK, manter

**i) Disclaimer** — já usa `splitTextToSize` com `CONTENT_WIDTH - 12` — OK

**j) General Guidelines** (linha 1274):
- Já usa `splitTextToSize` com `CONTENT_WIDTH - 10` — ajustar para `TEXT_MAX_WIDTH`

### 3. Auditoria completa
Fazer um pass por TODAS as chamadas `doc.text()` no arquivo para garantir que nenhuma use texto sem `splitTextToSize` quando o conteúdo pode ser longo (frases, nomes, descrições). Campos curtos e controlados (labels fixos, números, datas) não precisam.

## Arquivos a alterar
1. **`src/utils/generatePdf.ts`** — único arquivo, todas as correções acima

## Resultado esperado
Todo texto nos PDFs (básico, premium, profissional) respeitará as margens laterais, usando a largura da caixa do nome do paciente como referência máxima de preenchimento.

