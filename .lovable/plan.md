

# 3 ajustes: PDF básico + cadastro profissional

## 1. Frase motivacional — quebrar em 3 linhas e ajustar box

**Arquivo:** `src/utils/generatePdf.ts` (linhas 769-815)

**Problema:** O texto motivacional ultrapassa a margem do retângulo verde porque `motInnerW - 8` não é estreito o suficiente e o line spacing de 4pt é apertado demais para o fontSize.

**Correção:**
- Reduzir a largura do `splitTextToSize` de `motInnerW - 8` para `motInnerW - 16` (mais padding interno)
- Dividir o texto em 3 frases separadas por `\n` para forçar a quebra exata:
  - Linha 1: "Já tenho uma boa ideia por onde começar seu tratamento!"
  - Linha 2: "Adquira a avaliação premium para refinar nosso plano terapêutico e receber todas as orientações disponíveis!"
  - Linha 3: "Vamos juntos resolver essa dor."
- Ajustar o cálculo de `motBoxH` para acomodar as 3 linhas com spacing adequado (5pt ao invés de 4pt)
- Garantir que o texto fica dentro do box verde com margem segura

## 2. Remover emoji 🔓 do título "Desbloqueie sua Avaliação Completa"

**Arquivo:** `src/utils/generatePdf.ts` (linha 786)

**Problema:** O emoji `🔓` renderiza como texto ilegível (0=Y) no PDF pois jsPDF não suporta emojis nativamente.

**Correção:** Trocar `🔓 ${upsellTitle}` por apenas `${upsellTitle}` (sem emoji).

## 3. Adicionar opção "Outra" nas especialidades do cadastro profissional

**Arquivo:** `src/pages/ProfessionalRegister.tsx`

**Problema:** Não existe opção para especialidades fora da lista predefinida.

**Correção:**
- Adicionar um Badge "Outra" após os badges existentes (linhas 548-559)
- Quando clicado, exibir um Input de texto para o profissional digitar a especialidade customizada
- Ao confirmar, adicionar o texto digitado ao array `form.specialties`
- Estado local `showCustomSpecialty` e `customSpecialtyInput` para controlar o input
- Tradução: usar `t("prof.spec.other")` (adicionar chave nos 3 locales: "Outra" / "Other" / "Otra")

**Arquivos de tradução:** `src/locales/pt.json`, `en.json`, `es.json` — adicionar `prof.spec.other`

