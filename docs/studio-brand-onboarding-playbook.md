# Studio — Playbook de onboarding de marca (aprendizado consolidado)

Documento vivo. Base empírica: primeira marca de terceiro implantada no Studio público
(PerformaPro, acesso parceiro), levada de "artes genéricas" até ~95% de artes aprovadas e
publicáveis no Instagram. Cada item abaixo nasceu de um erro real ou de um acerto que precisa
ser preservado. Ler antes de mexer no motor criativo.

## 1. Isolamento de marca (falha mais recorrente — 3 ocorrências)

Ocorrências: `MonoBlock` (wordmark fixo), `StepsBlock` ("Método Aliv.iA"),
`CompareBlock`/`BrandBlock` e o acervo de conteúdo (`defaults.ts`, `brandContent.ts`).

Regras:
- Todo texto de marca vem de `src/pages/studio/brand.ts` (`BRAND_NAME`, `brandWordmarkParts()`).
- Fallback de nome ausente é `NEUTRAL_NAME` ("Sua marca"). Nunca a marca dona.
- Blocos exclusivos da marca dona (STEPS, D.I.F.I) só entram quando a marca ativa é a dona.
- Guarda automática: teste de varredura em `src/test/studio-coverage.test.ts` reprova qualquer
  literal de marca em `src/pages/studio/blocks/*`. Não silenciar o teste — corrigir o bloco.

## 2. Cota por geração, não por arte

Uma geração expõe ~60 artes (6 por público × objetivos informar/dor/desejo/venda + visão 360°),
então cobrar "por arte" era incompreensível e punia o usuário.

- 1 clique de geração = 1 crédito. Limites: Grátis 2, Solo 10, Marca 40, Agência 120, VIP ilimitado.
- `studio_credit_status()` prioriza concessões/parcerias sobre planos legados.
- Falha de leitura de cota exibe aviso mas **libera** a geração; o desconto é feito no servidor
  (`consume_studio_generation`). Bloquear por erro de leitura foi o pior bug de percepção do produto.

## 3. Entrega de conteúdo

- Carrossel é indivisível: todos os slides na mesma entrega, faixa com scroll lateral e snap,
  download e save da sequência inteira.
- Texto nunca corta nem termina em reticências: `condensePhrase` (`textFit.ts`) encurta em fronteira
  natural preservando a mensagem. Título com infinitivo pendurado é bug coberto por teste.
- Salvar não remonta o editor nem regera o lote; estado persiste por marca ao trocar de aba.
- PNG salvo em 1440px + miniatura retina + legenda; artes favoritadas alimentam a geração seguinte.

## 4. Kit de marca: entrada rica, interpretação forte

Fontes aceitas: site/landing, PDF de manual de marca, upload de logo nos formatos comuns.
`studio-brand-interpret` extrai proposta, cores, logo e tipografia (16 fontes curadas em
`brandFonts.ts`, aplicadas nas artes). Cores passam por `contrast.ts` para garantir legibilidade.

Erros a não repetir:
- Tom de voz é diretriz estratégica; jamais imprimir esse texto na arte.
- Logo mal captada precisa de fallback manual por upload, não de arte sem logo.
- Foto do usuário exige afinidade temática real (`photoMeaning.ts`): termografia não pode virar
  legenda genérica. Manter o público "pessoa com dor / cliente final" no motor.

## 5. Campos e vocabulário

- Dores / Desejos / Soluções que ofereço: 8 linhas, texto livre. Não normalizar no `onChange`
  (espaço e Enter precisam funcionar); normalizar apenas no `onBlur`.
- Labels: "Soluções que ofereço" e "Objetivo / CTA deste público".
- Proibido globalmente: prazo, responsável, escopo e afins de gestão de projeto.
- Proibido por ora: menções a biblioteca de evidências / PEDro nos blocos de números (beta).

## 6. Acabamento visual

- Áreas de segurança de margem por formato, sobretudo Stories 9:16 (`blockPadding` em `shared.ts`).
- Assinatura da marca com contraste automático e sem sobrepor texto (caso `SearchBlock`).
- Contornos e traçados consistentes (caso da seta do `SignpostBlock`).
- Animações pesadas desligadas em mobile (`StudioMotion.tsx`) + `loading="lazy"` nas imagens.

## 7. Autenticação e conta

Espelhar o app clínico: botão Sair visível, cadastro com confirmação de senha e visibilidade,
e-mail automático de definição de senha para acessos cortesia, sem beco de "conta já existe".

## 8. Checklist obrigatório para cada nova marca

1. Kit extraído de site/PDF/logo; tipografia identificada.
2. Paleta validada por contraste.
3. Públicos preenchidos (dores, desejos, soluções, objetivo/CTA).
4. Uma geração de teste com o seletor de modelos em "Aleatório".
5. Varredura de vazamento de marca (rodar os testes do Studio).
6. Conferência de margens, assinatura e ausência de texto cortado.
7. Cota coerente com o plano/concessão do usuário.
