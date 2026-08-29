---
name: Studio Brand Signature
description: Toda arte do Studio (interno e público) sai assinada com logo/nome da marca; ajuste global por marca "Assinatura da marca nos conteúdos".
type: feature
---
- Studio interno: `StudioCapture` aplica `StudioSignature` em toda arte.
- Studio público: `StudioProSignature` envolve cada bloco no editor Criar (canto por hash, tom adaptado ao fundo, sem duplicar quando o layout já traz logo/wordmark).
- Coluna `studio_brands.signature_enabled` (boolean, default true) controla o ajuste; toggle na aba Ajustes da marca.
- Objetivo: proteger o material contra print/cópia sem crédito; usa logo e nome da própria marca do cliente.

## Kit de marca: regras duras (2026-08-29)
- "Tom de voz" é DIRETRIZ de escrita: nunca é renderizado como texto nas artes (slogan sai da descrição/nicho/tagline).
- Cores têm papéis: `primary` = fundo/marca, `primary2` = texto sobre ela (contraste ≥ 4.5:1), `secondary` = destaque, `secondary2` = neutro claro. A interpretação por IA corrige o par automaticamente.
- `studio-brand-interpret` extrai o logo real do site (img com "logo", og:image, apple-touch-icon) — nunca grava a URL do site como logo.
- Cota: o e-mail vem do JWT ou de `auth.users`; acesso cortesia = plano Solo (60 artes). Saldo parcial gera o que resta em vez de bloquear.

## Ativos da marca (2026-08-28)
- Aba Ajustes tem upload de **manual da marca em PDF/imagem**: vai como anexo multimodal para `studio-brand-interpret` e, quando presente, é a FONTE PRINCIPAL do kit (prevalece sobre site e campos atuais). O arquivo não é guardado — só o briefing interpretado.
- **Logo por upload** (PNG/JPG/WEBP/SVG) é reduzido a 640px e salvo como data URL em `logo_url` — evita CORS no PNG exportado. Campo de URL continua disponível.
- **Tipografia**: chave curada em `colors.font` (lista em `src/pages/studio-pro/brandFonts.ts`, Google Fonts). Aplicada como `fontFamily` no wrapper das artes; a IA devolve `font_family` e o back casa com a mesma lista de chaves.

## Interpretação de manual em PDF: precisão exigida (2026-08-29)
- Onboarding real é "nome + PDF do manual": o que a IA não extrair, o usuário não vai corrigir. Precisão do parse é requisito, não conveniência.
- `secondary2` (neutro) precisa ser cor DISTINTA de `primary2` e de `secondary`; se colidir, derivar tom intermediário entre marca e claro.
- `extra` deve transcrever literalmente todos os hexadecimais do manual (até 8); kit aceita até 14 extras por categoria.
- Tipografia: `font_family` (títulos) + `font_body` (corpo) obrigatórios quando há manual; lista curada inclui Figtree, Urbanist, Rubik, Barlow, Karla.
- Formatos de arte: 9:16, 4:5 (post vertical do feed), 1:1 e livre.
