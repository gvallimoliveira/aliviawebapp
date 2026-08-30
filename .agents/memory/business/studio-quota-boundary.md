---
name: Studio Quota Boundary
description: Fronteira do débito de cota no Studio público — lote de boas-vindas grátis com aviso, "Nova versão" custa 1, navegação e salvar livres.
type: feature
---

Decisão do dono (ago/2026), modelo **híbrido**:

1. **Lote de boas-vindas grátis.** Ao entrar na aba de geração depois de configurar
   marca/kit, o lote já vem montado (seed sorteado no mount, `StudioProCreate.tsx`) e
   **não debita cota**. Isso é dito na tela: card "Este primeiro lote é por nossa conta"
   (ícone Gift), controlado por `src/pages/studio-pro/welcomeBatch.ts` (localStorage
   `studio.welcomeBatch.v1`, por marca). O aviso só aparece se a marca ainda não clicou
   em "Nova versão" **e** `quota.generationsLeft === quota.allowance` — assinante antigo
   não vê o recado. Some no primeiro clique em "Nova versão".
2. **"Nova versão" custa 1 geração** (`consume_studio_generation`) — único ponto de débito.
3. **Navegar é sempre livre**: público/nicho, objetivo (dor/desejo/informar/venda),
   modelos de post, formato e variação recompõem as artes com o MESMO seed, sem custo.
4. **Salvar e baixar PNG continuam livres** dentro da versão. Não migrar o débito para
   salvar/baixar sem renumerar os planos.

Razão: prova de valor no dia 1 e exploração sem medo de clicar (é assim que o cliente
descobre os modelos). O flag local só governa o AVISO — o débito é sempre do servidor.
