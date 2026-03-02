
# Fortalecer Branding da Logo Aliv.iA

## Resumo
Substituir a logo atual (`logo-alivia.png`) pela nova imagem enviada (mao humana + circuitos) em todos os locais onde ja e usada, e adiciona-la como elemento de destaque na landing page e no relatorio PDF.

## Mudancas

### 1. Substituir o arquivo da logo
- Copiar a imagem enviada (`user-uploads://Gemini_Generated_Image_k4oxibk4oxibk4ox.png`) para `src/assets/logo-alivia.png`, sobrescrevendo a atual.
- Todos os imports existentes (`Header.tsx`, `Auth.tsx`) ja apontam para esse caminho, entao a troca sera automatica.

### 2. Landing Page -- Hero com logo como elemento visual
- Em `HeroSection.tsx`, importar a logo e exibi-la como elemento grande e animado acima do titulo (ou ao lado em desktop).
- A logo aparecera com tamanho generoso (~120px), leve animacao de float/pulse com framer-motion, e um glow sutil em teal ao redor (coerente com o blur de fundo ja existente).
- Substituir o icone `Shield` do badge por nada ou manter, ja que a logo fala por si.

### 3. Landing Page -- Footer com logo
- Em `Footer.tsx`, adicionar a logo pequena (~40px) acima do texto de disclaimer, centralizando-a como marca visual.

### 4. Relatorio PDF -- Logo no cabecalho
- Em `generatePdf.ts`, converter a logo para base64 e inseri-la no cabecalho do PDF ao lado do texto "Aliv.iA" usando `doc.addImage()`.
- A logo sera exibida com ~12mm de altura, alinhada a esquerda, com o texto "Aliv.iA" deslocado para a direita.
- Para manter o PDF auto-contido, a logo sera embutida como string base64 constante no arquivo.

### 5. WelcomeStep -- Logo no onboarding
- Em `WelcomeStep.tsx`, substituir o icone `Heart` pelo import da logo, exibindo-a no circulo de boas-vindas para reforcar a identidade.

## Detalhes tecnicos

- **PDF base64**: Sera necessario converter a imagem PNG para base64 e armazena-la como constante em `generatePdf.ts` (ou arquivo auxiliar). O jsPDF suporta `addImage(base64, 'PNG', x, y, w, h)`.
- **Hero animation**: Usar `motion.img` com `animate={{ y: [0, -6, 0] }}` e `transition={{ repeat: Infinity, duration: 3 }}` para um efeito de float suave.
- **Glow effect**: Aplicar `drop-shadow` via Tailwind ou `filter` CSS para simular o brilho teal da imagem original.

## Arquivos afetados
- `src/assets/logo-alivia.png` (substituido)
- `src/components/HeroSection.tsx`
- `src/components/Footer.tsx`
- `src/utils/generatePdf.ts`
- `src/components/assessment/WelcomeStep.tsx`
