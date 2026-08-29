---
name: Studio Color Precision & Lado A/B
description: Inversão de cores por arte (lado A/B), captura de tom pixel a pixel do manual e conta-gotas no kit de marca.
type: feature
---
- **Lado A / Lado B**: cada arte na página de geração tem botão "Inverter cores" — troca os papéis das duas cores principais (`primary` ↔ `primary2`) só naquela arte, via tokens CSS (`buildBrandThemeStyle({ invert: true })` em `src/pages/studio-pro/brandTheme.ts`). Não gasta geração nem crédito de IA. Lado B salvo ganha sufixo `-b` no PNG/snapshot/seed para não sobrescrever o lado A; inverter invalida o estado "Salvo".
- **Tema único**: tokens de cor/fonte das artes saem só de `brandTheme.ts` (usado pelo editor Criar); não duplicar o cálculo em componentes.
- **Captura pixel a pixel**: `src/pages/studio-pro/paletteExtract.ts` lê a imagem no canvas, agrupa por vizinhança perceptual e devolve o hex do pixel dominante de cada grupo (tom real, sem média esmaecida). UI no `BrandColorFields` (ColorSampler): upload de página do manual/logo, chips com % de área e clique direto na imagem para capturar um ponto.
- **Conta-gotas**: cada swatch do kit tem botão com a EyeDropper API (só aparece em navegador compatível).
- **IA**: `studio-brand-interpret` deve copiar o hexadecimal do manual caractere por caractere; hex manda sobre CMYK/Pantone; só RGB → conversão exata; amostra sem código → tom estimado, refinado depois com o conta-gotas.
