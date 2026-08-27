# Atalho do Studio na tela de início + abertura própria

Dois problemas, com uma regra inegociável: o app principal Aliv.iA não muda de comportamento.

## 1. O atalho continua abrindo o Aliv.iA normal

Hoje o `index.html` declara o manifest principal e um script tenta **trocar** o `href` depois. No iOS o manifest já foi lido nesse ponto, então o atalho é salvo como o app principal.

Correção:

- Nenhum `<link rel="manifest">` fixo no HTML. Um script síncrono no topo do `<head>` **cria** o link já com o manifest correto (Studio se a rota começa com `/studio-pro`, principal em qualquer outro caso). Mesmo comportamento de hoje para o app principal, só sem depender de troca posterior.
- O mesmo script decide ícone Apple, `theme-color`, título e `apple-mobile-web-app-title` antes de qualquer render.
- Cada manifest recebe um `id` distinto (`/` para o Aliv.iA, `/studio-pro` para o Studio), que é o campo usado pelo sistema para tratar os dois como aplicativos separados — sem isso o iOS/Android pode reaproveitar a instalação existente.
- `start_url` do Studio passa a `/studio-pro?source=studio-pwa`, e uma trava de segurança: se por qualquer motivo essa marca chegar em outra rota, o app manda o usuário para `/studio-pro`.

Depois de publicar: apagar o atalho antigo da tela de início e criar de novo (iOS congela ícone e destino no momento da instalação — atalho velho nunca se corrige sozinho).

## 2. Abertura (splash) própria do Studio

A tela de abertura mostra a frase "...sistema de raciocínio clínico com alma de fisioterapeuta" também no Studio, o que não faz sentido para um produto de marketing.

- A splash passa a ter duas variações: rotas `/studio-pro*` usam o logo/ícone Studio, a cor do Studio e uma frase própria de marca/criação; qualquer outra rota mantém exatamente a splash atual, palavra por palavra.
- Chave de exibição separada (`alivia:splash-last-shown` continua do app principal; o Studio ganha a sua), para que abrir o Studio não "gaste" a splash do Aliv.iA nem o contrário.

Frase sugerida para o Studio: "...seu estúdio de conteúdo, com alma de marca." Se preferir outra, é só dizer.

## Blindagem do app principal

- Só o ramo `pathname.startsWith("/studio-pro")` muda; o caminho do Aliv.iA recebe manifest, ícone, tema e splash idênticos aos atuais.
- Nenhum service worker novo, nenhuma alteração em auth, `main.tsx`, cliente do backend ou cache.
- Teste antes de encerrar: abrir `/` (splash e título antigos, manifest principal) e `/studio-pro` (splash e manifest Studio), no navegador e em mobile.

## Arquivos

- `index.html` — script síncrono único que injeta manifest/ícone/tema por rota.
- `public/studio-manifest.webmanifest` — `id`, `start_url` com `source=studio-pwa`.
- `public/manifest.webmanifest` — apenas o campo `id`.
- `src/components/SplashScreen.tsx` — variação Studio por rota, chave própria.
- `src/pages/studio-pro/useStudioPwaMeta.ts` — mantido como reforço, alinhado ao script.
