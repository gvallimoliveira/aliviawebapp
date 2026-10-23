# Repetição opcional nos agendamentos

## Objetivo
Permitir que um atendimento (manual ou vindo do print interpretado pela IA) se repita, com o mínimo de cliques, no mesmo estilo do Google Agenda.

## Como fica para o profissional

**Novo atendimento (manual)**
- Um único campo novo, logo abaixo de data/horário: **"Não se repete"** (já vem assim por padrão, então nada muda para quem não usa).
- Ao tocar, abre a lista curta:
  - Não se repete
  - Toda semana (no mesmo dia, ex.: "toda sexta")
  - 2x por semana / dias escolhidos (ex.: seg e qua)
  - A cada 2 semanas
  - Todo mês
  - Personalizar...
- Assim que algo diferente de "Não se repete" é escolhido, aparece só uma linha: **"Termina: após [10] sessões"** ou **"em [data]"**. Padrão: 10 sessões (combina com pacotes de fisioterapia). Limite de segurança: 6 meses / 60 sessões.
- Uma pré-visualização em uma linha: "Serão criados 10 atendimentos, até 25/12".
- "Todo dia" e "Todo ano" ficam fora da lista principal (pouco úteis na clínica); continuam possíveis em "Personalizar".

**Importação por print (IA)**
- Nada muda na lista de agendamentos interpretados.
- No rodapé, um seletor único opcional: **"Repetir os selecionados: Não se repete / Toda semana / A cada 2 semanas"** + "por N semanas". Aplica a todos os marcados, mantendo o dia da semana e o horário de cada um. Compromissos pessoais podem ser desmarcados da repetição.

**Editar ou excluir um atendimento que se repete**
- Ao salvar mudança de horário ou excluir, pergunta (como no Google): **"Só este" / "Este e os seguintes"**. Sessões já realizadas ou com evolução registrada nunca são alteradas nem apagadas.
- Um pequeno ícone de repetição no card da agenda identifica a série.

**Conflitos**
- Antes de criar, verifica choques com horários já ocupados; mostra "2 datas já têm atendimento nesse horário" com opção de pular essas datas ou criar mesmo assim.

## O que fica fora (para não poluir)
- Sem regras complexas (ex.: "segunda quinta-feira do mês").
- Sem sincronizar com o Google Agenda.
- Feriados não são pulados automaticamente nesta versão.

## Detalhes técnicos
- Banco: adicionar a `professional_appointments` as colunas opcionais `series_id uuid` e `recurrence_rule jsonb` (frequência, intervalo, dias, término). Aditivo, sem mudar registros existentes.
- Geração das ocorrências é feita no app, com uma função pura `src/lib/appointmentRecurrence.ts` (datas no calendário local America/Sao_Paulo, nunca `toISOString`), inserindo linhas reais em lote — agenda, relatórios, ocupação e faltas continuam funcionando sem alteração.
- Inserção sempre com `service_type` explícito (evita a regressão do lote misto).
- "Este e os seguintes": update/delete por `series_id` + data >= atual, filtrando sessões com status realizado ou evolução vinculada.
- Pontos de alteração: `ProSchedule.tsx` (criação manual), `AppointmentEditorDialog.tsx` (edição/exclusão), `AgendaImportModal.tsx` (rodapé de repetição).
- Testes: semanal 10 sessões, dias escolhidos, quinzenal, mensal no dia 31 (ajusta para o último dia do mês), limite de 60, término por data, "este e os seguintes" preservando sessões realizadas, lote importado misto com repetição.
- Textos pt/en/es e Suporte (Support.tsx + ClinicSupport.tsx) atualizados.
