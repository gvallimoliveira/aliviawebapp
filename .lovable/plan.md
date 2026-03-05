# Landing Page: Imagens Atualizadas + Gatilhos Mentais

## 1. Substituir imagens do "Como Funciona"

Expandir de 3 para 6 etapas visuais mostrando o fluxo real do app, usando os screenshots enviados. Layout em grid responsivo (2 colunas mobile, 3 desktop) com as imagens enquadradas em mockup de celular/browser.

Mapeamento das imagens:

- Etapa 1 "Conte sobre sua dor" → `anamnesealivia1.JPG`
- Etapa 2 "Marque onde dói" → `anamnsealivia3.JPG` (slider de intensidade, mais visual que o pain map vazio)
- Etapa 3 "Questionários validados" → `quest.JPG`
- Etapa 4 "Testes funcionais" → `funcao.JPG`
- Etapa 5 "Diagnóstico detalhado" → `diag.JPG`
- Etapa 6 "Plano de tratamento" → `fases.JPG`

Copiar as 6 imagens para `src/assets/` e atualizar `HowItWorksSection.tsx` com os novos imports e dados. Atualizar as chaves de traducao em `LanguageContext.tsx` para os 6 passos.

## 2. Gatilhos Mentais na Landing Page

### A. Hero -- Urgencia + Curiosidade

- Adicionar subtexto abaixo do CTA: "Mais de 100 pessoas ja descobriram a causa da sua dor" (prova social imediata).
- Adicionar micro-badge "Resultado em menos de 15 minutos" para reduzir friccao percebida.

### B. Secao "Por que a Aliv.iA?" (Highlights) -- Autoridade

- Adicionar um destaque de autoridade: "Formulada por fisioterapeuta pos-graduado com 7+ anos de experiencia" com icone de selo/verificacao.

### C. Secao Comparativa -- Aversao a Perda + Ancoragem

- Adicionar frase de ancoragem acima da tabela: "Uma sessao de fisioterapia custa em media R$150-300. A Alivia oferece avaliacao completa + plano de tratamento por apenas R$129."
- Destacar visualmente os recursos que o usuario PERDE ao nao escolher Premium (cor mais forte nos "X" do basico).

### D. Secao de screenshots -- Curiosidade + Prova de Valor

- Abaixo do "Como Funciona", adicionar frase-gatilho: "Veja por dentro o que voce vai receber" antes das imagens.
- Adicionar 2 imagens extras como "bonus visual": o relatorio PDF (`relatorio.JPG`) e o diario de dor (`diariodor.JPG`) com labels como "Exclusivo Premium".

### E. CTA flutuante -- Urgencia

- Adicionar um botao CTA fixo no rodape (sticky bottom bar) que aparece ao rolar para baixo, com texto "Comece sua avaliacao agora" e botao para Premium.

## Arquivos afetados

- `src/assets/` -- 8 imagens novas copiadas
- `src/components/HowItWorksSection.tsx` -- expandir para 6+ etapas, nova secao "por dentro"
- `src/components/HeroSection.tsx` -- adicionar micro-badges de prova social e tempo
- `src/components/HighlightsSection.tsx` -- adicionar card de autoridade
- `src/components/ComparisonSection.tsx` -- adicionar frase de ancoragem de preco
- `src/contexts/LanguageContext.tsx` -- novas chaves de traducao (pt + en)
- `src/pages/Index.tsx` -- adicionar componente de CTA sticky

## Detalhes tecnicos

- Imagens copiadas com `lov-copy` para `src/assets/step-*.jpg`
- Layout do HowItWorksSection: grid `grid-cols-2 md:grid-cols-3` com cards menores e imagens com `rounded-xl shadow-lg border`
- CTA sticky: `fixed bottom-0` com `z-50`, aparece via scroll listener ou Intersection Observer, animado com framer-motion
- Badge "Exclusivo Premium" sobre imagens: `absolute` posicionado com fundo primary