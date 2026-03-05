## Plano: Relatório PDF Profissional com Anamnese Detalhada e Mapa de Dor

### Objetivo

Enriquecer o PDF gerado para o fisioterapeuta com: (1) seção detalhada de anamnese com todos os dados coletados e (2) imagem visual do mapa de dor mostrando as regiões selecionadas pelo paciente.

nao somente o pdf mas tambem a pagina destino do campo onde se clica no nome do paciente que realizou a avaliaçao

### Abordagem

#### 1. Seção de Anamnese no PDF (`generatePdf.ts`)

Adicionar nova seção antes do diagnóstico com os campos de `anamnesis_data`:

- Queixa principal + queixa customizada
- Modo de início (onset)
- Regiões de dor (lista)
- Nível de dor (EVA X/10)
- Tipos de dor
- Evolução
- Fatores agravantes / aliviantes
- Nível de atividade física
- Acesso a academia
- Duração da dor
- Sexo biológico / faixa etária (se preenchidos)
- Resultados de questionários aplicados (se houver `test_results`)

Cada campo renderizado com label em negrito + valor, formato compacto.

#### 2. Mapa de Dor como Imagem no PDF

Gerar um SVG do mapa de dor programaticamente (sem depender do DOM):

- Para cada vista (front/back/left/right) que contenha regiões selecionadas, renderizar um mini SVG com a imagem de fundo e os paths das regiões selecionadas destacados em vermelho
- Converter o SVG para canvas via `Image` + `canvas.toDataURL()` para inserir como imagem no jsPDF
- Exibir as 4 vistas lado a lado (ou apenas as vistas relevantes) em tamanho compacto

#### 3. Interface `PdfOptions` expandida

Adicionar campos opcionais ao `PdfOptions`:

```typescript
interface PdfOptions {
  diagnosis: Diagnosis;
  treatmentPlan: TreatmentPlanData;
  language: "pt" | "en";
  userName?: string;
  anamnesisData?: AnamnesisData;  // novo
  painRegions?: string[];          // novo
  testResults?: any;               // novo (questionários)
}
```

#### 4. Chamada atualizada

Atualizar `TreatmentPlan.tsx` (onde `generateAssessmentPdf` é chamado) para passar os novos dados do assessment.

### Arquivos


| Arquivo                                       | Mudança                                                                      |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/utils/generatePdf.ts`                    | Expandir `PdfOptions`, adicionar seção anamnese + mapa de dor SVG→canvas→PNG |
| `src/components/assessment/TreatmentPlan.tsx` | Passar `anamnesisData`, `painRegions`, `testResults` ao gerar PDF            |


### Detalhes Técnicos

Para o mapa de dor no PDF:

- Importar as imagens de corpo (body-front.jpg etc.) como base64
- Importar `regionsByView` de `painMapData.ts`
- Criar SVG string com `<image>` + paths selecionados preenchidos em vermelho
- Renderizar via `new Image()` → `<canvas>` → `toDataURL("image/png")` → `doc.addImage()`
- Mostrar apenas vistas que contêm regiões selecionadas, até 4 mini-mapas lado a lado (~40mm cada)