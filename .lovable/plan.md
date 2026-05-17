## Objetivo
Eliminar definitivamente o efeito de abrir o card da agenda com uma exibição antiga e depois trocar para a atual, além de corrigir o recorte/layout do campo de evolução no mobile.

## Causa raiz identificada
O modal da agenda hoje mistura três problemas no mesmo ciclo de abertura:
1. **Estado residual do modal**: vários fechamentos usam `setModalOpen(false)` diretamente, mas a limpeza mais completa está concentrada no `onOpenChange`. Isso permite que parte do estado visual e da evolução sobreviva entre aberturas.
2. **Abertura incremental do conteúdo**: `openEdit` abre o modal e injeta pedaços do estado em sequência, enquanto buscas assíncronas continuam preenchendo dados depois. O resultado é um “flash” com conteúdo antigo/parcial antes do estado final.
3. **Layout mobile apertado**: o `DialogContent` + `ScrollArea` + bloco de ações da evolução estão no limite da largura/altura do viewport pequeno, gerando sensação de recorte e proporção ruim.

## Plano de correção
### 1) Centralizar o ciclo do modal
Criar uma rotina única para:
- resetar **todo** o estado do modal;
- abrir modal novo;
- abrir modal de edição;
- fechar modal.

Essa rotina vai substituir os fechamentos diretos com `setModalOpen(false)` para que **todo fechamento passe pela mesma limpeza completa**, incluindo:
- `editingApt`
- campos do formulário
- seleção de paciente
- estado de evolução (`evoOpen`, `evoLoading`, `evoText`, `evoAssessmentId`, `evoExistingContent`, request keys)
- flags auxiliares de UI

### 2) Tornar a abertura atômica
Reestruturar `openEdit` para não “montar” o modal aos pedaços.

Vou mudar para este fluxo:
1. montar um snapshot inicial limpo do appointment;
2. aplicar esse snapshot inteiro antes da renderização útil;
3. só então abrir o modal;
4. disparar o carregamento da evolução com um token da sessão atual do modal.

Assim o modal já nasce no estado correto, sem reaproveitar visual anterior.

### 3) Blindar contra resposta assíncrona atrasada
Apesar de já existir proteção parcial por `requestId`, vou amarrar a evolução a uma **sessão única do modal** (não só ao appointment), invalidando qualquer resposta pendente quando:
- trocar de card;
- fechar modal;
- salvar ou excluir evolução;
- navegar para o paciente.

Isso evita que uma busca velha “pinte” o modal recém-aberto.

### 4) Forçar remount correto do conteúdo do modal
Hoje o `key` do `DialogContent` depende só do `editingApt?.id`. Vou trocar para uma estratégia de **session key** de abertura, para garantir remount real em toda nova abertura — inclusive ao reabrir o mesmo agendamento.

Isso é importante porque reabrir o mesmo card com a mesma `id` pode manter DOM/estado visual reutilizado.

### 5) Separar claramente “carregando evolução” de “layout do formulário”
O bloco de evolução vai deixar de alterar o layout de forma brusca na abertura.

Ajuste planejado:
- renderizar um contêiner estável para a seção de evolução;
- mostrar skeleton/loading dentro dele, sem mudar altura abruptamente;
- evitar que “Registrar evolução” apareça e suma no meio da abertura.

### 6) Corrigir proporção mobile do bloco de evolução
Vou ajustar especificamente no mobile:
- largura útil interna do modal;
- padding horizontal do `ScrollArea`;
- altura mínima do textarea;
- empilhamento e largura dos botões;
- espaço entre textarea, ações e bloco de “evoluções anteriores”.

Meta: o campo ficar visualmente íntegro, sem sensação de borda cortada ou conteúdo espremido em 440px.

### 7) Validar os fluxos críticos
Depois da limpeza, vou validar estes cenários:
- abrir card A, fechar, abrir card B;
- abrir o mesmo card duas vezes seguidas;
- abrir card com evolução já existente;
- abrir card sem evolução;
- abrir card de data passada;
- salvar evolução e reabrir;
- verificar se o lápis permanece coerente no card.

## Detalhes técnicos
```text
Novo fluxo proposto:
closeAppointmentModal()
  -> invalida sessão atual
  -> limpa todo estado visual e assíncrono
  -> fecha modal

openEdit(apt)
  -> cria modalSessionKey nova
  -> aplica snapshot limpo do apt
  -> abre modal
  -> inicia prepareEvolutionEditor ligado à sessão atual

prepareEvolutionEditor(sessionKey, apt)
  -> ignora qualquer retorno se a sessão mudou
  -> preenche apenas o bloco da evolução
```

## Resultado esperado
- Sem flash de “layout antigo” ao tocar no card.
- Sem troca visual tardia do bloco de evolução.
- Campo de evolução com proporção melhor no mobile.
- Mesmo comportamento correto para consultas passadas e para cards já com evolução.