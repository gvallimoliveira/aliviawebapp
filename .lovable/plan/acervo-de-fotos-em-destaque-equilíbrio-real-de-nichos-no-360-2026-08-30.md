# Acervo de fotos em destaque + equilíbrio real de nichos no 360°

Dois ajustes no motor criativo do Studio, válidos para todas as marcas (não só Guilherme Vallim).

## 1. Fotos do acervo muito mais presentes (com filtro dedicado)

Hoje, quando a marca tem acervo, cada página tem 30% de chance de usar "foto como plano de fundo" (`photoVeil`) e as demais peças fotográficas entram no miolo em primeira camada. Com 39 fotos na marca Guilherme Vallim isso rende pouco aproveitamento.

O que muda:

- Novo filtro no menu de criação: **"Fotos do acervo em destaque"**. Ligado, o lote passa a ter **no mínimo metade das artes com foto do acervo como plano de fundo** — não é sorteio, é cota garantida por lote.
- Com o filtro desligado, a presença de fundo fotográfico sobe do patamar atual para cerca de 45% em marcas com acervo grande (4+ fotos), mantendo a regra já existente: se a arte usa foto de fundo, não usa foto em primeira camada na mesma peça.
- Fotos de "ampla aplicação" (sem restrição clínica como termografia/laser) passam a ser aceitas para qualquer assunto com peso maior, para o acervo circular de verdade em vez de só as fotos de afinidade máxima aparecerem.
- O filtro fica salvo por marca, junto das outras preferências de criação, e vale igualmente no Studio interno, no Studio Pro e no modo autoral.

## 2. Visão 360° com atenção criativa equilibrada

Hoje a Visão 360° sorteia, quando cai em público, apenas entre os **públicos matriz** e sem nenhuma memória: por isso lotes seguidos caem repetidamente em 60+, dor crônica ou feridas, e sub-nichos (ex.: Atendimento Domiciliar RJ) nunca entram.

O que muda:

- O sorteio do 360° passa a considerar **todos os públicos e sub-nichos** da marca, não só os matriz.
- Entra uma **memória de cobertura por marca**: público usado recentemente perde vez; quem está há mais tempo sem aparecer é priorizado. Efeito prático: ao longo de alguns lotes todos os nichos recebem atenção parecida, sem perder o determinismo (mesma seed = mesma arte).
- Dentro de um mesmo lote, quando há mais de uma arte de público, os públicos não se repetem enquanto houver nicho não usado.
- Continua havendo artes "da marca como um todo" (assunto livre), apenas sem monopolizar nem deixar nichos parados.

## 3. Aliv.iA Studio: profissões concretas em Autônomo e Pequena Empresa

Nos públicos "Criador Solo / Autônomo" e "Negócio Local / Pequena Empresa" da marca Aliv.ia Studio, a copy passa a citar profissões concretas para gerar identificação — advogado, dentista, fisioterapeuta, educador físico, nutricionista, médico, comerciante, arquiteto, personal, salão/barbearia, pet shop, entre outras — rotacionando por arte (e sem repetir a mesma profissão dentro do lote). A profissão entra no texto como sujeito real ("o dentista que...", "quem tem um salão e..."), nunca como lista.

## Detalhes técnicos

- `src/pages/studio/composePage.ts`: parâmetro novo `photoFirst` (cota de `photoVeil` por lote) + `veilChance` elevado; mantém exclusividade véu × primeira camada.
- `src/pages/studio/photoMeaning.ts`: bônus para fotos sem restrição (uso amplo) e faixa de circulação levemente mais larga.
- `src/pages/studio-pro/StudioProCreate.tsx`, `StudioProAuthorial.tsx` e controles do Studio interno: toggle "Fotos do acervo em destaque" persistido em `readPersisted/writePersisted`.
- `src/pages/studio-pro/brandContent.ts` (`buildSegmentContent`, ramo `GLOBAL_SEGMENT`): sorteio sobre `audiences` completo com pesos vindos da memória de cobertura, e exclusão de repetição intra-lote.
- Nova memória de cobertura por marca: `studio_segment_memory` (brand_id, segment_id, uses, last_used_at) com RLS + GRANTs no padrão das outras tabelas do Studio, e hook `useSegmentMemory` espelhando `usePhraseMemory` (decaimento ~30 dias).
- `src/pages/studio-pro/audiences.ts` / `brandDnaKit.ts`: léxico de profissões aplicado só aos dois públicos do Aliv.ia Studio, com rotação determinística.
- Testes do motor atualizados: cota de fotos por lote e distribuição de nichos ao longo de vários lotes.
