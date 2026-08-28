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
