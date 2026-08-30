---
name: Studio Photo Library
description: Acervo privado de fotos no backend usado pelas artes do Studio e os 3 blocos fotográficos (tipografia gigante, split, retrato editorial).
type: feature
---

- Fotos ficam no backend (bucket privado `studio-photos`, pasta por usuário + tabela `studio_photos`), nunca no localStorage: precisam persistir entre dispositivos e servir o Studio público depois.
- **Acervo é por marca**: `studio_photos.brand_id` (cascade ao excluir a marca). No Studio público `listPhotos(brandId)`/`uploadPhoto({brandId})` isolam o acervo — marca nova nasce vazia e nunca puxa fotos de outra marca do mesmo dono. Studio interno (`/studio`) segue sem marca (`brand_id` null) e lê o acervo da conta.
- **Teto do plano é da CONTA, não da marca**: o trigger `studio_photos_limit` conta todas as fotos do `owner_id` (soma das marcas) e a UI mostra "N desta marca · T de LIMITE no plano" (`countPhotos()` + prop `usedTotal` em `StudioPhotos`).
- RLS por `auth.uid()` no banco e no storage: cada foto é visível apenas para quem enviou. A foto de atendimento real é material sensível — nunca tornar bucket público nem expor a outra conta.
- Metadados: `label`, `usage` (`institucional` | `atendimento` | `produto` | `livre`), `credit`, `sort_order`.
- As fotos são carregadas como **data URL** (`photos.ts`), porque html-to-image não clona imagem remota sem CORS — requisito para o export PNG.
- Blocos fotográficos (`photoType`, `photoSplit`, `photoPortrait`): entram na composição só quando o acervo tem foto (`composePage(..., photoCount)`), no máximo 2 por página, sempre no miolo. Sem foto, `pickPhoto` devolve `undefined` e o bloco não renderiza — jamais usar imagem genérica.
- Estilos definidos com o usuário: tipografia gigante atrás do sujeito; meia-face/split vertical (só o `strong` da headline, frase longa fica ilegível); retrato editorial com palavras destacadas por `renderAccent`.
- Fotos já cadastradas nas duas contas VIP (9): retrato do fundador (institucional), registro real de atendimento, orientação de carga em pé, correção de movimento no joelho e avaliação com termografia (atendimento, crédito "Registro autorizado"), laserterapia e ambiente do estúdio (produto), agachamento com barra e exercício de tornozelo/pé (livre) — cada uma com enquadramento inicial já definido.
- Editor de enquadramento (`StudioPhotoEditor.tsx`, botão de recorte em cada foto): ponto focal por clique, zoom 1–3×, rotação −180..180 e área segura (`none` | `top` | `bottom`), com preview em 9:16, 1:1 e meia-face.
- O enquadramento é persistido em `studio_photos` (`focus_x`, `focus_y`, `zoom`, `rotation`, `safe_area`) e aplicado por **um único** componente: `blocks/PhotoFrame.tsx`. Blocos fotográficos nunca renderizam `<img>` direto — sempre via `PhotoFrame`, para o recorte escolhido uma vez valer em todas as artes e no export PNG.
- Rotação compensa escala (`|cos|+|sin|`) para não sobrar canto vazio; área segura aplica véu gradiente na faixa onde o texto cai.
- **Nexo foto × assunto (regra)**: foto nunca vale pela literalidade. `photoMeaning.ts` traduz label/categoria em temas extrapolados (carga e progressão, controle motor, medir antes de decidir, mão no paciente, sistema/tela, anatomia/estudo, voz e marca) e cada tema aponta tópicos compatíveis (hep, dinamometria, STEPS, alta/relatório de evolução, D.I.F.I, etc.).
- Blocos fotográficos escolhem PRIMEIRO a copy pelo `picker` (dívida editorial) e só depois a foto por afinidade (`pickPhotoForTopics`). Sem foto com nexo, o bloco não renderiza.
- Proibido usar `photo.label` como título/headline — gerava arte literal ("AGACHAMENTO COM BARRA" em post de preço de estudante).
- **Studio público (planos)**: teto de fotos por plano — grátis 0 (acervo bloqueado), Solo 20, Marca 60, Agência/VIP 120. Fonte da verdade no banco: trigger `studio_photos_limit` + `studio_photo_limit_for` (VIP e cortesia via `studio_granted_access` incluídos); `plan.ts` só reflete o teto na UI.
- Upload: máximo 15 MB por arquivo (bucket `studio-photos` também limitado a 15MB); acima de ~2.5 MB a imagem é reduzida no cliente para 2400px antes do envio. Se o insert falhar (limite), o arquivo é removido do storage.
- Cada foto tem **descrição breve** (`description` em `studio_photos`) escrita pelo usuário — o insumo mais forte do nexo (`readingText` em `photoMeaning.ts` usa label + descrição + crédito). Continua proibido usar como headline.
- **Fotos fixadas (controle criativo)**: alfinete em cada card; com fotos fixadas só elas alimentam os blocos fotográficos, mas o nexo foto × assunto continua valendo (foto fixada sem nexo simplesmente não gera bloco). Estado persistido por marca em `pinnedPhotos`.
- **Circulação do acervo (regra)**: a escolha não fica presa às fotos de afinidade máxima — `pickPhotoForTopics` circula por toda a faixa que sustenta o assunto (`CIRCULATION_BAND = 0.5` da melhor pontuação) e embaralha a ordem por índice (`spread`, determinístico: mesma seed = mesma foto). Blocos fotográficos por página: véu 30% de chance; com 4+ fotos no acervo, 70% de chance de duas peças fotográficas. Fotos restritas (termografia/laser) continuam fora de assunto alheio.
