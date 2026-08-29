# Editar o post original na galeria (sem gerar arte nova)

## O que está acontecendo hoje

Quando você abre "Editar texto e formato" na galeria, o Studio **não abre a arte salva** — ele reconstrói a arte do zero a partir da receita (público, objetivo, seed, blocos) e só depois tenta colar por cima o texto que foi salvo.

Duas coisas quebram essa reconstrução:

1. O editor da galeria remonta o conteúdo com o motor textual (léxico, frames, memória de frases da marca) e **sem o perfil de variação** que o lote usou. Como a memória de frases da marca muda a cada geração, o texto sorteado hoje não é o mesmo de quando você salvou.
2. O texto salvo é guardado por **posição numérica** dos elementos de texto. Se a arte remontada tem um elemento a mais, a menos, ou em outra ordem — o que também acontece ao trocar o formato — o texto entra deslocado ou não entra.

Resultado: a arte que aparece no editor é uma arte nova, não a sua.

## Como resolver

Parar de reconstruir e passar a **guardar a arte pronta** no momento em que ela é salva.

1. **Ao salvar uma arte (de agora em diante)**, além do PNG e da miniatura, o Studio guarda um instantâneo da arte renderizada: o HTML final da arte (já com o texto exato, blocos, fundo, ornamentos e assinatura), as variáveis de cor/fonte da marca aplicadas e o formato original. Imagens do acervo entram no instantâneo como dado embutido, para não depender de link que expira.
2. **Ao editar pela galeria**, o editor abre esse instantâneo — pixel a pixel a mesma arte que você salvou. Nenhuma geração, nenhum crédito, nenhum sorteio de frase.
3. **Editar texto** continua direto na arte: os campos de texto do instantâneo viram editáveis, com as mesmas travas de hoje (nada vazio, sem jargão). O que muda é só a frase que você reescreveu.
4. **Trocar formato** (Livre, 1:1, 4:5, Story 9:16) passa a reenquadrar a arte original dentro da nova proporção: a arte é escalada por inteiro e o espaço restante é preenchido com a cor de fundo da marca. Nada é recomposto nem cortado — o conteúdo é o mesmo, só a moldura muda.
5. **Salvar** regrava o PNG, a miniatura, o texto e o instantâneo **na mesma arte da galeria** (não cria item novo).
6. **Artes salvas antes desta atualização** não têm instantâneo. Nessas, o botão de edição fica desativado, com o aviso: "Esta arte foi salva antes do editor; gere uma nova versão na aba Criar para poder editá-la." Sem risco de trocar a arte por outra.

## Detalhes técnicos

- Nova coluna em `studio_creations`: `snapshot jsonb` (`{ version, format, theme, slides: [{ storage_path, width, height }] }`). O HTML de cada slide vai para o bucket `studio-art` como arquivo `.html` (evita inflar a linha e o payload da galeria).
- `StudioProCreate.tsx` (`saveOne` e `saveCarousel`): antes de exportar o PNG, serializar o nó da arte (`outerHTML`), converter `img`/`background-image` de storage para data URL, capturar as CSS vars do tema e a largura de referência, subir os arquivos e gravar `snapshot`.
- Novo módulo `src/pages/studio-pro/artSnapshot.ts`: `captureSnapshot(node, opts)` e `loadSnapshot(snapshot)`. Sanitização do HTML antes de injetar (remover `script`, `style` externo, atributos `on*`).
- `StudioArtEditor.tsx`: quando `art.snapshot` existir, renderizar o HTML do instantâneo em um wrapper com `transform: scale()` + `object-fit: contain` dentro da moldura do formato escolhido, em vez de montar `STUDIO_BLOCKS` via `useArtRender`. A edição de texto reaproveita `artTextEdit.ts` (`collectEditableNodes`, `applyArtText`, `setArtEditing`) sobre o nó do instantâneo, e o texto passa a ser gravado por caminho estável do elemento (tag + índice na árvore), não por posição plana.
- Sem `snapshot`: editor abre em modo somente leitura com o aviso de arte legada. `useArtRender` continua no código para outros usos, mas deixa de ser o caminho da edição da galeria.
- Teste em `src/test/studio-art-snapshot.test.ts`: captura → carrega → edita uma frase → o restante do HTML permanece idêntico; troca de formato não altera o conteúdo textual.

## Fora do escopo

Não recriar retroativamente instantâneos de artes antigas (o conteúdo original delas não é recuperável de forma confiável).
