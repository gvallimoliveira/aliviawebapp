

## Correções no PDF da Avaliação Básica

### 3 Problemas Identificados no Código

**1. Recorte de seções entre páginas** (linhas 346-378, 646-723, 725-728)
- `renderPainMapSection` faz `checkPage` para o título separado do conteúdo (linha 350 checa 65px, mas depois faz outro `checkPage` na linha 359). O título pode ficar numa página e as imagens na seguinte.
- `renderSectionTitle` faz `checkPage(y, 14)` independente — não considera o conteúdo que vem depois.
- **Fix**: Em `generateBasicReportPdfBlob`, antes de chamar cada seção (VAS, Pain Map, Upsell), calcular a altura total necessária (título + conteúdo) e fazer um único `checkPage` com esse valor. Para o pain map, estimar ~90mm (título + imagens). Para VAS, ~35mm.

**2. Emojis como texto** (linhas 698-704)
- `doc.text(emojis[i], ...)` renderiza caracteres Unicode que o jsPDF não suporta visualmente — aparecem como caixas ou texto.
- **Fix**: Remover as linhas 698-705 dos emojis. Manter apenas a barra de gradiente colorida + marcador + labels "Sem dor" / "Pior dor" que já existem e funcionam bem.

**3. Upsell com preços errados e ícone estranho** (linhas 734, 752-754)
- Título usa `"🔓"` que renderiza como caractere estranho no jsPDF.
- `ctaText` mostra "R$ 19,90" e "R$ 29,90" que são valores incorretos.
- **Fix**: Remover emoji do título, deixar apenas texto. Remover a linha `ctaText` com preços. Manter apenas os bullet points de benefícios.

### Alterações

**Arquivo: `src/utils/generatePdf.ts`**

- **Linha 648**: Aumentar `checkPage` do VAS para 35 (título + barra + labels)
- **Linhas 698-705**: Remover bloco de emojis
- **Linhas 725-728**: Antes do pain map, fazer `checkPage(y, 95)` para garantir título + imagens juntos
- **Linha 734**: Trocar `"🔓 Desbloqueie..."` por `"Desbloqueie sua Avaliação Completa"` (sem emoji)
- **Linhas 752-754**: Remover `ctaText` e a linha que o renderiza (775). Substituir por texto sem preço, ex: "Acesse o app para desbloquear todos os recursos."
- **Linha 757**: Recalcular `upsellH` sem a linha de preço

| Arquivo | Ação |
|---|---|
| `src/utils/generatePdf.ts` | Remover emojis, corrigir upsell, prevenir split de seções |

