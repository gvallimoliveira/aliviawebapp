# Agenda: sem zoom acidental e arrasto só com toque longo

## 1. Zoom acidental na aba Agenda
No celular (iPhone), o sistema ignora parcialmente o bloqueio de zoom: um toque duplo ou um leve gesto de pinça sobre a grade amplia a tela inteira, e o botão "Novo agendamento" fica cortado à direita.

O que muda:
- Na aba Agenda, toque duplo e pinça deixam de ampliar a tela.
- A rolagem dentro da grade (lateral e vertical) continua normal.
- Nada mais na página pode ficar mais largo que a tela, então o botão de agendar fica sempre inteiro.
- Se por acaso a tela já estiver ampliada ao abrir a aba, ela volta ao tamanho normal.

## 2. Arrasto só com toque longo (celular)
Hoje basta encostar e mover 6 px para o card mudar de lugar.

O que muda:
- No toque: é preciso manter o dedo parado no card por 0,6 s. Aí o card "levanta" (leve aumento + vibração curta, quando o aparelho permite) e só então pode ser arrastado.
- Se o dedo se mover antes desse tempo, é rolagem normal da agenda — o card não sai do lugar.
- Toque rápido continua abrindo o card.
- No computador (mouse) o arrasto continua imediato.
- Texto de dica no celular: "Toque e segure um card para reagendar".

## Detalhes técnicos
- `ProSchedule.tsx` `handleCardPointerDown`: para `pointerType` touch/pen, timer de 600 ms; movimento > 8 px antes do timer cancela (deixa o scroll nativo); após o timer, `beginDrag` + `navigator.vibrate?.(15)`, e só então `preventDefault` nos `touchmove` (listener não-passivo) para travar a rolagem durante o arrasto. Mouse mantém o limiar atual.
- Cards: `touch-action: pan-x pan-y` e `-webkit-touch-callout: none`/`user-select: none` para não abrir menu de texto no toque longo.
- Container da agenda: `touch-action: pan-x pan-y` (bloqueia pinça/duplo toque), wrapper com `overflow-x-hidden` e `max-w-full`; listener `gesturestart` com `preventDefault` enquanto a aba está montada (iOS Safari/PWA).
- Ghost do arrasto: garantir que não amplie a largura da página (posição fixa dentro da tela).
- Suporte pt/en/es: atualizar instrução de reagendamento no celular.
