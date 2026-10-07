# Prontuário enxuto para rotinas cheias + histórico de 45 dias

Objetivo: um atleta com 15+ sessões por semana não pode transformar a frente do controle de carga numa lista enorme. A frente mostra só o recente; o histórico fica numa janela própria.

## Regras de exibição na frente do prontuário

1. **Listas em texto = últimos 3 dias** (hoje, ontem, anteontem).
   - Vale para "Sessões monitoradas" e "Sessão por sessão" (dose planejada x percebida).
   - **Agrupadas por dia, recolhidas**: uma linha por dia, por exemplo "Hoje · 4 sessões · sRPE 1.250 · 1 sem resposta". Tocar abre as sessões daquele dia.
   - Se não houver nada nos últimos 3 dias, a lista mostra os 3 dias mais recentes que tiverem dados, com o aviso "Sem registros nos últimos 3 dias — exibindo os mais recentes".
2. **Gráficos = últimos 7 dias corridos** (hoje + 6 dias anteriores), mudando a cada dia.
   - "Carga semanal" passa a mostrar barras por dia nesses 7 dias, empilhadas por frente (Fisio, Academia, Cardio, Outro esporte), com o total no topo.
   - O gráfico de dose planejada x percebida usa a mesma janela de 7 dias corridos. Os totais do topo passam a ser "Planejado nos últimos 7 dias" e "Real registrado nos últimos 7 dias". Sessões futuras continuam fora da comparação e aparecem só como "a realizar" numa linha curta.
   - Se não houver dados nos últimos 7 dias, o gráfico mostra os 7 dias mais recentes que tiverem dados, com o mesmo aviso.
3. **Cartões por frente**: com 4 frentes ativas, ficam numa faixa horizontal (padrão do prontuário), em vez de empilhados.
4. Os cálculos de risco (carga aguda 7d, crônica 28d, ACWR, planejamento automático) **não mudam**: continuam usando todo o histórico necessário. Só a exibição fica mais curta.

## Janela "Ver histórico"

- Botão "Ver histórico" nos cartões de Sessões monitoradas, Carga e Dose. Abre uma janela por cima do prontuário, sem sair da página e sem mudar a posição da tela.
- Abre mostrando os **últimos 45 dias**. Filtros: frente e período (7, 14, 30, 45 dias ou "Mais antigos").
- "Mais antigos" carrega blocos anteriores de 45 dias: **nada é apagado**, tudo continua guardado.
- Conteúdo: gráfico diário de carga do período, lista agrupada por dia (mesmo formato recolhido da frente), selos de dose por sessão (dose certa, subdosado, superdosado, sem resposta) e o resumo de cada check-in.

## Ajuda

Atualizar a página de Suporte (profissional e clínica) em pt/en/es explicando: a frente mostra 3 dias, o gráfico mostra 7 dias corridos e o histórico completo fica em "Ver histórico".

## Detalhes técnicos

- Novo helper puro `src/lib/loadWindows.ts`: `recentDaysWindow(items, days, today)` (com fallback para os dias mais recentes com dado), `groupByDay`, `rollingDailySeries(entries, 7, today)` por frente. Coberto por testes, incluindo o caso "atleta com 15 sessões/semana" e o fallback sem dados recentes.
- `adherenceByTrack` ganha variante por intervalo (`fromISO`, `toISO`) para a janela de 7 dias corridos, mantendo as regras atuais (só sessões até hoje e com resposta; futuras e sem resposta à parte).
- Componente compartilhado `DayGroupList` (dia recolhido → sessões) usado em `ProfessionalCardioEntry`, `DoseAdherenceCard` e na janela de histórico.
- `LoadHistoryDialog.tsx`: busca `srpe_entries`, `periodization_sessions` e `readiness_checkins` por intervalo de datas (paginação de 45 em 45 dias), sem recarregar a seção. Botões com `type="button"`; fechar a janela não move a página.
- Carregamento inicial da seção passa a buscar só o necessário para os cálculos (28 dias + semana corrente); o histórico é buscado sob demanda na janela.
- Registrar a regra em `AGENTS.md` (frente = 3 dias de texto e 7 dias corridos de gráfico; histórico sob demanda) e na memória do módulo de periodização.
