# Studio: redação completa guiada pelo DNA Aliv.iA

Transformar o `/studio` de "gerador de variações" em uma redação de verdade: identidade codificada, novos formatos de post (storytelling, listas, marca) e copy alinhada à estratégia definida — **converter fisios Pro + atrair pacientes B2C + autoridade**, tom **equilibrado com provocação leve**, provas **anonimizadas**, CTA sempre apontando para a **landing do mundo** do post.

## Eixo 1 — DNA de marca codificado

Hoje o posicionamento vive espalhado na copy. Vamos criar `src/pages/studio/content/brandDna.ts`, fonte única consultável:

- **Posicionamento e promessa** por mundo (o que se vende, para quem, contra qual dor).
- **Dores e desejos do público** (fisio: noites de prontuário, desvalorização, medo de errar conduta; paciente: medo do "é só desgaste", confusão do Google, exercício errado).
- **Léxico da marca**: palavras preferidas ("raciocínio", "método", "clareza") e proibidas ("curar", "milagre", promessa de resultado).
- **Limites da provocação leve**: cutuca rotina e burocracia, nunca o colega nem o paciente; automatiza esforço, nunca julgamento (regra da leitura adversa, hoje só em memória, vira teste automatizado sobre as headlines).

## Eixo 2 — Três novos formatos de post

Cada um com 3-4 tratamentos visuais, reaproveitando o kit gráfico (tramas, ornamento, destaque de palavra) e o sistema de motion:

1. **StoryBlock (storytelling)** — mini-casos anonimizados: kicker → 3-4 beats ("Uma fisio do interior, 10 pacientes/dia, prontuário até 22h") → virada → moral + tópico opcional. É onde entram as provas reais anonimizadas aprovadas ("recuperou 5h/semana", sem nome).
2. **ListBlock (lista editorial)** — valor puro sem tela de produto: "4 sinais de que sua documentação afasta paciente", "3 erros ao prescrever exercício domiciliar". Tipográfico, numerado, com fecho que amarra no produto. Cobre o "informativo" que hoje só existe atrelado a feature.
3. **BrandBlock (lockups de marca)** — composição abstrata institucional com variantes de presença: logo gigante ao fundo + statement, logo pequena no canto + frase, wordmark "Aliv.iA" tipográfico puro, selo com o slogan oficial. Resolve o pedido de logo grande/pequena/nome.

## Eixo 3 — Expansão de copy por mundo

- **Pro (prioridade)**: +8-10 headlines de provocação leve na linha já aprovada ("Sua agenda cheia não deveria custar suas noites"), 4-5 stories anonimizadas, CTAs reforçando "link na bio".
- **Paciente (B2C)**: headlines de dor/desejo expandidas, stories de paciente ("aposentada que aceitou conviver com a dor"), ofertas e CTAs da avaliação gratuita.
- **Autoridade**: novas quotes/typos de manifesto em primeira pessoa do ofício (formato aprovado: "Medo do movimento também é achado clínico.").
- **Acadêmico/Clínica**: manutenção leve, sem investimento novo nesta rodada.

## Eixo 4 — Fundação para o Studio como produto futuro

Sem construir o produto agora. Apenas:

- Centralizar logo + slogan em módulo único (`src/pages/studio/brand.ts`), eliminando imports diretos espalhados — primeiro passo para um dia virar "tema do cliente".
- Registrar no memory o roadmap: onboarding por URL do site → extração automática do DNA (cores, tipografia, tom) → upload de screenshots do produto → mesmo motor de personas/blocos/cobertura gerando posts com a marca do cliente. O design atual já favorece isso: tokens semânticos, conteúdo 100% desacoplado dos blocos, imagem vinculada a tópico (equivalente ao screenshot que o cliente enviaria).

## Guardas e validação

- `studio-coverage.test.ts`: novos kinds registrados, headlines novas passando pelo teste de leitura adversa, proibição de `image` na copy mantida.
- Novos blocos entram no `composePage` (pool ponderado, sem repetir em sequência), no `caption.ts` (ângulo de legenda próprio) e no mapa de render do `StudioLanding`.
- Story/List/Brand são institucionais (sem tópico obrigatório), como typos — não geram dívida editorial.
- Typecheck + build limpos.

## Fora de escopo

Studio público/produto (só documentação de arquitetura), mudanças nas landings de produção, publicação.

## Detalhes técnicos

- **Novos**: `content/brandDna.ts`, `brand.ts`, `blocks/StoryBlock.tsx`, `blocks/ListBlock.tsx`, `blocks/BrandBlock.tsx`.
- **Editados**: `composePage.ts` (BlockKind + TREATMENT_COUNT + pools), `caption.ts` (3 ângulos novos), `StudioLanding.tsx` (mapa BLOCKS), `content/professional.ts`, `content/patient.ts`, `content/defaults.ts` (novos pools `stories`, `lists`), `content/types.ts` (novos tipos), `personas.ts` (gostos para os novos blocos), `ClosingBlock.tsx`/`HeroBlock.tsx` (logo via `brand.ts`), `src/test/studio-coverage.test.ts`.
- **Memória**: atualizar `studio-marketing-landing.md` e criar registro do roadmap Studio-as-a-product.
