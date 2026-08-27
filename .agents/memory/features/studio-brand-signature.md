---
name: Studio Brand Signature
description: Toda arte do Studio (interno e público) sai assinada com logo/nome da marca; ajuste global por marca "Assinatura da marca nos conteúdos".
type: feature
---
- Studio interno: `StudioCapture` aplica `StudioSignature` em toda arte.
- Studio público: `StudioProSignature` envolve cada bloco no editor Criar (canto por hash, tom adaptado ao fundo, sem duplicar quando o layout já traz logo/wordmark).
- Coluna `studio_brands.signature_enabled` (boolean, default true) controla o ajuste; toggle na aba Ajustes da marca.
- Objetivo: proteger o material contra print/cópia sem crédito; usa logo e nome da própria marca do cliente.
