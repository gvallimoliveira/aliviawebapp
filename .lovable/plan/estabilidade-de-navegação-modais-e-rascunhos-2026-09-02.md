# Estabilidade de navegação, modais e rascunhos

Objetivo: acabar com os três comportamentos que você viveu no tablet — a página voltar sozinha para um passo anterior, um modal reabrir depois de fechado, e a avaliação manual abrir já oferecendo "rascunho da nuvem" sem você ter digitado nada.

## O que está causando cada sintoma (verificado no código e no banco)

1. **"O app recarregou do nada uma página anterior"** — há duas causas somadas:
   - `src/lib/versionChecker.ts` faz **auto-reload silencioso** sempre que a aba volta a ficar visível ou recebe foco e existe um build novo publicado. Mostrando o app e trocando de aba/app no tablet, isso disparava repetidamente.
   - `src/lib/sessionPersistence.ts` grava a última rota a cada navegação e, no boot em `/` ou `/index`, reescreve a URL para a rota salva (janela de 6h). Ou seja: depois do reload, você não voltava para onde estava, e sim para uma rota antiga gravada — daí a sensação de "voltou 2 passos".
   - Agravante: `versionChecker` e `sessionPersistence` **ambos** sobrescrevem `history.pushState`/`replaceState`, encadeando patches sobre a navegação do React Router.

2. **"Um modal que eu já tinha fechado reabriu"** — `ManualAssessmentResumer` faz polling de 500 ms por 30 s e re-tenta reabrir em `focus`, `visibilitychange`, `pageshow` e `storage`. Ele reabre sempre que encontra o marcador de sessão (TTL de 12h) e não guarda registro de que aquela sessão já foi encerrada/descartada — em navegação intensa isso vira reabertura fantasma.

3. **"Avaliação manual já vem com rascunho na nuvem"** — confirmado no banco: existem linhas em `form_drafts` de 1288 bytes, tamanho idêntico entre vários pacientes, ou seja **estado inicial vazio**. O `useAutosaveDraft` salva porque o objeto de estado nunca é `{}` (tem `step: 0` e strings vazias). Basta abrir o modal por 2 segundos para nascer um "rascunho". Além disso, quando o paciente não tem e-mail o escopo cai no **nome** (`...:valéria`, `...:pedro`), o que pode misturar pacientes homônimos.

## O que vou fazer

### 1. Recarregamento só quando for seguro
- Remover o auto-reload por foco/visibilidade. A atualização passa a ser sempre por decisão sua (toast "Atualizar agora"), exceto num caso: erro real de chunk obsoleto, que já é tratado em `main.tsx`.
- Ampliar a lista de rotas/estados intocáveis para incluir "existe modal aberto" e "existe rascunho em edição".

### 2. Restauração de rota deixa de disputar com a navegação
- A restauração de rota no boot passa a valer apenas quando o app foi de fato descarregado enquanto estava numa tela profunda (marcador gravado em `pagehide`/`freeze` na mesma sessão), com janela curta (~30 min) em vez de 6h.
- Navegação normal (abrir e fechar telas) nunca mais dispara reescrita de URL.
- Consolidar o monkey-patch de `history` num único utilitário com assinatura de eventos, em vez de dois módulos patchando em cadeia.

### 3. Modais que fecham, ficam fechados
- Registrar o encerramento explícito de uma sessão de modal (fechou, salvou ou descartou) e impedir reabertura automática dessa sessão.
- Reduzir a agressividade do resumer: uma tentativa no boot + tentativa em `pageshow` real de retomada, sem polling de 500 ms por 30 s.
- Reabertura automática só quando o rascunho tem conteúdo real (não estado vazio) e a sessão foi interrompida sem fechamento explícito.
- Guard global: nenhum modal automático se já existe um diálogo aberto na tela.

### 4. Rascunho só existe quando há conteúdo
- `useAutosaveDraft` passa a comparar o estado atual com o **estado inicial**: se não houve mudança significativa (nenhum texto, nenhuma seleção, nenhuma medida), não grava nem local nem na nuvem.
- Não oferecer "restaurar rascunho" para payload sem conteúdo.
- Escopo do rascunho passa a usar o identificador do paciente quando disponível, com nome apenas como último recurso — fim das colisões por homônimo.
- Limpeza: apagar as linhas fantasma já existentes em `form_drafts` (as de estado vazio) e expirar automaticamente rascunhos antigos.

### 5. Abrir/fechar sem sobressaltos
- Padronizar o fechamento dos modais grandes (avaliação manual, HEP) para desmontar de forma limpa, cancelando buscas em andamento em vez de aplicar resultado depois de fechado (fonte de "piscadas" e reaberturas de estado).
- Revisar o `ScrollToTop` para não rolar ao topo em mudanças que são apenas de parâmetro/estado na mesma tela.

## Verificação
- Percurso automatizado no navegador: painel → prontuário → avaliação manual (abrir e fechar sem digitar) → voltar ao painel → prontuário de outro paciente → HEP, checando que nenhuma rota volta sozinha, nenhum modal reabre e nenhum rascunho é oferecido.
- Simular troca de aba/app (visibilidade) com build novo disponível e confirmar que não há reload silencioso.
- Consulta ao banco após o teste para confirmar que abrir e fechar o modal não cria linha em `form_drafts`.
- Testes existentes de retomada de avaliação continuam passando.

## Notas técnicas
Arquivos centrais: `src/lib/versionChecker.ts`, `src/lib/sessionPersistence.ts`, `src/hooks/useAutosaveDraft.ts`, `src/lib/manualAssessmentSession.ts`, `src/components/dashboard/ManualAssessmentResumer.tsx`, `src/components/dashboard/ManualAssessmentModal.tsx`, `src/components/dashboard/CreateExerciseProgramModal.tsx`, `src/components/ScrollToTop.tsx`. Nada em auth, service worker ou cliente do backend será tocado (regra de estabilidade de login).
