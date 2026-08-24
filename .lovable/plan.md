# Aliv.iA Studio — landing mutável para conteúdo de Instagram

Uma landing exclusiva de marketing, viva só no preview, que muda de composição a cada comando — feita para você gravar tela e recortar posts sem repetir sempre o mesmo visual.

## Como vai funcionar

Rota oculta: `/studio` (sem link em menus, sem sitemap, `noindex`).

Acesso duplo:
- Só renderiza fora do domínio publicado (preview/localhost). Na URL pública, mostra um 404 igual ao resto do app.
- Além disso exige login com um dos seus e-mails VIP admin. Sem sessão VIP, também 404.

Barra de controle flutuante (só no `/studio`, oculta ao gravar com a tecla `H`):
- **Nova versão** — sorteia uma nova composição instantânea (ordem das seções, efeitos, densidade, acento, copy).
- **Mundo** — Profissional / Estudante / Paciente / Clínica, ou "sortear". Cada versão foca um mundo só, para o post ficar coeso.
- **Formato** — `9:16` (tela cheia vertical, stories/reels), `1:1` (quadrado, feed) e `livre` (responsivo normal). O formato define uma moldura de gravação com as proporções corretas na tela.
- **Semente** — cada versão gera um código curto (ex.: `pro-9x16-4f2a`) exibido na barra e refletido na URL (`/studio?w=pro&f=9x16&s=4f2a`). Assim você reabre exatamente a mesma versão que gostou.
- Botão **copiar link** da versão atual.

Comando no chat: quando você disser "nova landing preview", eu amplio o repertório — novas seções, novos efeitos, novo copy, novas combinações — sem mexer nas landings reais. O botão continua sorteando entre tudo o que já existe; o chat é o que renova o baralho.

## Identidade travada

Nunca muda: tipografia do projeto, paleta base (teal + tons terrosos warm), logo, cantos arredondados, tom de voz Aliv.iA.

Pode variar por versão: ordem e escolha das seções, intensidade e tipo de animação, densidade tipográfica (linha única gigante vs. bloco editorial), fundo (claro warm, escuro statement, malha técnica, grão sutil), acento secundário dentro da paleta, alinhamento (centralizado, à esquerda, assimétrico), presença de marquee/contadores/mockups.

## Repertório inicial de seções (blocos sorteáveis)

Cada bloco é autossuficiente e funciona como um post isolado:

1. **Hero statement** — frase-manifesto do mundo escolhido + logo, ocupando a tela.
2. **Kinetic word** — momento escuro com palavra única escalando (herda o primitivo já otimizado para 2 scrolls).
3. **Prova em números** — 3 métricas com contagem animada.
4. **Antes / depois do fluxo** — comparação lado a lado ("como era" vs. "com Aliv.iA").
5. **Passo a passo sticky** — visual fixo com etapas avançando no scroll (usa as imagens de step já no projeto).
6. **Card de recurso em close** — um recurso por tela, mockup grande.
7. **Citação / manifesto** — bloco tipográfico em fundo de destaque (como a captura que você postou).
8. **Marquee de valências** — faixa contínua com termos clínicos.
9. **Fechamento com CTA** — assinatura da marca + slogan.

Cada bloco tem 2–3 tratamentos visuais alternativos, então a mesma seção nunca aparece igual duas vezes seguidas.

## Copy por mundo

Um arquivo de conteúdo por mundo (profissional, acadêmico, paciente, clínica), com múltiplas variantes de cada frase — headline, sub, métricas, citação, CTA. O sorteio escolhe entre variantes, então dois posts do mesmo mundo saem diferentes.

Só português nesta página (é material de Instagram BR), sem passar pelo sistema de i18n.

## Detalhes técnicos

- Nova rota `/studio` em `src/App.tsx`, lazy, fora de qualquer navegação. Guard: `getPublicOrigin`-style check de origem de preview + `useAuth` com a whitelist de `src/lib/vipEmails.ts`; qualquer falha renderiza `NotFound`.
- `src/pages/studio/` com: `StudioLanding.tsx` (composer), `StudioControls.tsx` (barra), `variants.ts` (registro de blocos + tratamentos), `content/{professional,academic,patient,clinic}.ts` (copy variante).
- Sorteio determinístico por semente (PRNG simples a partir da string da semente), para o mesmo link sempre reproduzir a mesma página.
- Reaproveita os primitivos existentes em `src/components/scroll/` (`Reveal`, `KineticStatement`, `StickyShowcase`, `BrandMarquee`, `ScrollProgress`); blocos novos ficam em `src/pages/studio/blocks/`.
- Moldura de formato: wrapper com `aspect-ratio` e `max-h`/`max-w` calculados, com guias discretas fora da área gravável.
- Zero mudança nas landings de produção, no sitemap, no `robots.txt` ou nos componentes compartilhados.
- Memória: registro em `.agents/memory/features/studio-marketing-landing.md` com a regra "nunca publicar, nunca linkar, identidade travada".
