## Objetivo
Reconstruir completamente o modal do card da agenda no modo profissional autônomo para eliminar a exibição antiga antes da atual, corrigir o layout mobile e consolidar num único fluxo confiável:
- dados cadastrais básicos do paciente
- dados do agendamento
- classificação do atendimento (concluído, falta, falta justificada, em aberto)
- evolução do paciente
- ações práticas relacionadas ao atendimento

## O que será refeito
### 1) Separar o modal do restante da agenda
Extrair o modal para uma estrutura isolada, com estado próprio de edição, em vez de manter abertura/fechamento e evolução espalhados pelo `ProSchedule`.

Resultado esperado:
- abrir um card não reaproveita visual do card anterior
- fechar limpa tudo de forma imediata e previsível
- reabrir o mesmo card monta uma sessão nova de verdade

### 2) Criar um modelo único de estado do modal
Substituir o conjunto atual de muitos `useState` soltos por um estado único/snapshot de sessão do modal, contendo:
- identificação do agendamento
- dados básicos do paciente
- dados do atendimento
- status atual
- estado da evolução
- flags de carregamento/salvamento

Isso evita montagem incremental e reduz o “flash” de conteúdo antigo.

### 3) Refazer o fluxo de abertura
Abertura nova do modal:
1. criar uma nova sessão do modal
2. montar snapshot inicial completo do agendamento
3. renderizar o modal já com estrutura final estável
4. carregar apenas os complementos assíncronos dentro de áreas dedicadas, sem trocar o layout principal

### 4) Refazer a seção de classificação do atendimento
Transformar o status em um bloco claro e estável, sempre visível para atendimentos existentes, com opções práticas:
- Em aberto
- Concluído
- Falta
- Falta justificada

Esse bloco ficará desacoplado da evolução, para que a mudança de status não interfira no restante da renderização.

### 5) Refazer a seção de evolução
Reconstruir a evolução como um bloco próprio do modal, sempre previsível:
- campo visível de forma consistente
- possibilidade de preencher em datas passadas
- carregamento interno sem desmontar a UI
- histórico anterior em área colapsável ou listagem compacta
- salvar/excluir última evolução sem provocar re-render confuso do modal inteiro

### 6) Corrigir layout e proporção mobile
Reorganizar o modal para a viewport atual mobile (~440px):
- largura útil real do conteúdo
- padding interno estável
- textarea maior e sem recorte
- botões com hierarquia melhor
- rolagem apenas onde necessário
- rodapé fixo/estável visualmente

### 7) Preservar ações úteis
Manter no modal apenas o que for válido e prático para o fluxo:
- editar dados principais do agendamento
- alterar classificação/status
- registrar evolução
- excluir agendamento
- abrir paciente quando aplicável

## Causa raiz que será atacada
O comportamento atual indica três problemas estruturais combinados:
- estado residual entre aberturas
- carregamento assíncrono mexendo no mesmo bloco visual já renderizado
- modal grande demais e com layout dependente de conteúdo dinâmico

A correção efetiva será arquitetural, não apenas ajuste pontual de classes ou resets.

## Detalhes técnicos
- Refatorar o modal para um componente isolado dentro do fluxo da agenda
- Introduzir uma `modalSessionKey` real por abertura
- Remover resets fragmentados e timers que deixam resíduo visual na transição
- Carregar evolução e dados auxiliares por sessão, descartando qualquer resposta atrasada
- Renderizar skeleton/placeholder apenas dentro dos blocos assíncronos, sem trocar toda a estrutura
- Atualizar imediatamente o card/listagem após salvar status/evolução, inclusive o indicador de lápis

```text
ProSchedule
  -> seleciona appointment
  -> abre AppointmentModal(sessionKey, initialSnapshot)

AppointmentModal
  -> seção dados básicos
  -> seção status do atendimento
  -> seção evolução
  -> ações finais

Async por sessão
  -> loadPatientDetails(sessionKey)
  -> loadEvolution(sessionKey)
  -> ignore responses if session changed
```

## Validação após reconstrução
Vou validar estes cenários:
- abrir card A, fechar, abrir card B
- abrir o mesmo card duas vezes seguidas
- abrir atendimento passado e registrar evolução
- trocar status sem fechar modal
- salvar evolução e confirmar atualização do ícone de lápis
- verificar se não existe mais “layout antigo” antes da UI final
- verificar proporção e rolagem no mobile

## Entrega
A implementação vai focar exclusivamente na reconstrução efetiva do modal da agenda e na estabilização do fluxo de status/evolução, sem expandir escopo para outras áreas.