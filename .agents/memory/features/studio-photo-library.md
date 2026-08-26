---
name: Studio Photo Library
description: Acervo privado de fotos no backend usado pelas artes do Studio e os 3 blocos fotográficos (tipografia gigante, split, retrato editorial).
type: feature
---

- Fotos ficam no backend (bucket privado `studio-photos`, pasta por usuário + tabela `studio_photos`), nunca no localStorage: precisam persistir entre dispositivos e servir o Studio público depois.
- RLS por `auth.uid()` no banco e no storage: cada foto é visível apenas para quem enviou. A foto de atendimento real é material sensível — nunca tornar bucket público nem expor a outra conta.
- Metadados: `label`, `usage` (`institucional` | `atendimento` | `produto` | `livre`), `credit`, `sort_order`.
- As fotos são carregadas como **data URL** (`photos.ts`), porque html-to-image não clona imagem remota sem CORS — requisito para o export PNG.
- Blocos fotográficos (`photoType`, `photoSplit`, `photoPortrait`): entram na composição só quando o acervo tem foto (`composePage(..., photoCount)`), no máximo 2 por página, sempre no miolo. Sem foto, `pickPhoto` devolve `undefined` e o bloco não renderiza — jamais usar imagem genérica.
- Estilos definidos com o usuário: tipografia gigante atrás do sujeito; meia-face/split vertical (só o `strong` da headline, frase longa fica ilegível); retrato editorial com palavras destacadas por `renderAccent`.
- Fotos já cadastradas nas duas contas VIP: retrato do fundador (institucional) e registro real de atendimento (atendimento, crédito "Registro autorizado").
