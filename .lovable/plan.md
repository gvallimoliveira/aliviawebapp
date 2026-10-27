# Estabilidade do prontuário + macrociclo aberto ao criar

## 1. Página pulando para o topo (Carga, periodização, links, macrociclo)

### O que já encontrei
Esse bloco é o único do prontuário com **vários mecanismos de "segurar a rolagem" ao mesmo tempo**, e eles disputam entre si:
- Todo clique dentro da seção força a tela por 2,5 s a ficar presa no último ponto tocado.
- A cada 20 s, e sempre que a janela volta ao foco (ao fechar o link de check-in, trocar de aba ou abrir o WhatsApp), a seção recarrega e prende a tela de novo por 2,2 s no **último elemento tocado**. Se você já rolou para outro lugar, a página é puxada de volta.
- Um "marcador de rolagem" salvo a cada toque restaura uma posição antiga se a seção remontar nos 10 s seguintes.
- A trava só é cancelada por roda do mouse ou dedo arrastando; barra de rolagem, rolagem por inércia ou teclado não a cancelam.

Isso explica bem os saltos "do nada" só nessa área. Ainda falta confirmar se, em alguns casos, o prontuário inteiro é remontado (sensação de "recarregar do início"): o painel do profissional recarrega a lista quando chega mudança de avaliação em tempo real, e preciso checar se isso troca o prontuário aberto por um carregamento.

### O que vou fazer
1. **Reproduzir primeiro** no navegador (celular e computador): abrir um prontuário com periodização, rolar, clicar em microciclo/links/macrociclo, simular a volta de foco e esperar o ciclo de 20 s, registrando a posição da tela e se a seção é remontada.
2. **Remover a disputa**: uma única proteção, curta, aplicada só quando um comando realmente muda o tamanho do conteúdo (salvar, abrir/fechar card), e nunca nas atualizações automáticas.
3. **Atualizações automáticas silenciosas de verdade**: a recarga de 20 s, foco e tempo real só atualiza os números, sem mexer na rolagem e sem trocar cards por "Carregando…".
4. Apagar o marcador de rolagem antigo e a trava global por clique.
5. Se a reprodução mostrar remontagem do prontuário pela atualização da lista de pacientes, manter o prontuário aberto montado durante essa atualização (sem tela de carregamento).
6. Conferir de novo o mesmo roteiro do passo 1 até a página não se mover sozinha.

## 2. Macrociclo deve abrir já expandido ao ser criado
Hoje o card "Macrociclo (fases do STEPS)" sempre nasce fechado. Mudança:
- Logo após clicar em **Criar**, o card abre mostrando as fases.
- Em prontuários que já tinham macrociclo, continua começando fechado (como hoje), para não alongar a página.

## Detalhes técnicos
- `PeriodizationSection.tsx`: remover `onClickCapture` com `anchorScroll`, `saveScrollMark`/restore via sessionStorage e o `anchorScroll` dentro de `load` para recargas silenciosas; manter âncora apenas em `refresh()` disparado por ação do usuário (onChanged), com cancelamento também por `scroll` do usuário/`pointerdown`.
- `PeriodizationCollapsible`: aceitar `open` controlado opcional; `createPlan` define `macroOpen=true`.
- Investigar `ProDashboard` → `scheduleRealtimeRefetch` / `PatientEvolutionDashboard` → `PatientDetailView` para garantir que refetch não desmonte o detalhe.
- Atualizar regra correspondente em `periodization/AGENTS.md`.
