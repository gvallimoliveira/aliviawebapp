# Acervo de fotos para todos os assinantes + controle criativo

Hoje o painel de fotos (enviar, rotular, enquadrar, remover) existe apenas no Studio interno (`/studio`). No Studio público, as fotos são só lidas: `StudioProCreate` carrega o acervo mas não oferece nenhuma tela de gestão. A tabela `studio_photos` e o bucket privado `studio-photos` já são por usuário.

## O que muda

### 1. Painel de fotos no Studio público
- Botão "Fotos do acervo" na barra do gerador, abrindo o mesmo painel já usado no interno (envio, rótulo, categoria de uso, enquadramento com recorte/zoom/rotação, remoção).
- Cada usuário vê e gerencia apenas as próprias fotos (regra de acesso por dono já vigente no banco e no storage; será reconfirmada).

### 2. Limite de fotos por plano
| Plano | Fotos no acervo |
|---|---|
| Grátis | 0 (acervo bloqueado, com convite para assinar) |
| Solo | 20 |
| Marca | 60 |
| Agência | 120 |
| VIP | 120 |

- Contador visível ("14 de 20 fotos").
- Bloqueio no envio quando o limite é atingido, com mensagem de upgrade.
- O limite também é verificado no banco no momento do registro da foto, para não depender do cliente.

### 3. Tamanho de arquivo
- Limite por arquivo: **15 MB** — cabe um JPG de câmera de celular/DSLR e um PNG pesado de tela.
- Acima de 15 MB: recusa com aviso claro.
- Fotos acima de ~2,5 MB são reduzidas no navegador antes do envio (lado maior 2400 px, qualidade alta): o acervo fica leve, o export PNG continua nítido e a conta não estoura.

### 4. Fotos fixadas (controle criativo)
- Cada foto do painel ganha um alfinete "usar nesta geração".
- Com fotos fixadas: apenas elas entram nas artes; o motor ainda escolhe qual foto vai em qual bloco pelo nexo com o tema (termografia/laser continuam restritas a contextos clínicos). Se nenhuma foto fixada fizer sentido no assunto daquela arte, o bloco fotográfico não entra — nunca haverá foto incoerente.
- Aviso no painel quando a fixação deixa blocos de fora ("2 fotos fixadas; 1 arte ficou sem bloco de foto por falta de nexo").
- Sem fixação, o comportamento atual continua: acervo inteiro, escolha por afinidade.
- A fixação é lembrada por marca, junto com o resto do estado do gerador, e o número de fotos fixadas entra na semente — mesma seleção, mesma arte.

## Detalhes técnicos

- `src/pages/studio-pro/plan.ts`: novo campo `photoLimit` em `StudioAccess` e em `PLAN_LIMITS` (free 0, solo 20, marca 60, agencia 120; VIP usa o teto de agência).
- `src/pages/studio-pro/StudioProCreate.tsx`: passa a usar `useStudioPhotos` com `add/edit/remove`, renderiza `StudioPhotos` em modal, aplica limite do plano e mantém `pinnedPhotoIds` no estado persistido por marca.
- `src/pages/studio/StudioPhotos.tsx`: recebe props opcionais `limit`, `pinnedIds`, `onTogglePin` e um cabeçalho de contagem; sem essas props o comportamento no Studio interno fica idêntico.
- `src/pages/studio/photos.ts`: `uploadPhoto` valida tamanho (15 MB) e faz o downscale por canvas; nova função `countPhotos` para o painel; `pickPhoto` inalterado.
- Fotos fixadas: `StudioProCreate` filtra o acervo antes de passar para `composePage`/blocos, então `pickPhotoForTopics` segue sendo o único juiz de nexo — nenhuma mudança na lógica de restrição.
- Banco: `file_size_limit` do bucket `studio-photos` ajustado para 15MB; trigger `before insert` em `studio_photos` que recusa o registro acima do limite do plano do dono (lendo plano por VIP → concessão → `studio_credits`, mesma ordem do app).
- Testes: caso em `src/test/` cobrindo (a) fixação restringe o pool sem quebrar o nexo e (b) limite por plano recusa o envio.
