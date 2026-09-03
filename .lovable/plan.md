# Prontuário de evolução: card enxuto + histórico completo em modal

## Problema

Hoje o bloco "Prontuário de Evolução" lista **todas** as sessões registradas dentro da página do paciente. Com meses de atendimento a página fica gigante e a rolagem impraticável.

## Como fica

**No prontuário (card fixo, altura previsível):**
- Cabeçalho com o total de sessões registradas e a data da última.
- Apenas as **3 sessões mais recentes**, no formato atual (data, evolução, observação, expandir, editar, duplicar, excluir).
- Botão "Ver histórico completo (N)" que abre o modal. O botão só aparece quando há mais de 3 registros.
- Botão "Registrar evolução" continua no card, com o mesmo comportamento (inclusive a abertura externa pelo rail lateral).

**Modal "Histórico de evolução":**
- Lista completa, ordenada do mais recente para o mais antigo (ordem atual mantida).
- Campo de busca por texto (evolução + observação) e filtro por período (todos / últimos 30 dias / últimos 90 dias / ano atual).
- Agrupamento por mês/ano ("Setembro de 2026") como separador, para leitura rápida.
- Carregamento incremental: mostra 20 registros e um botão "Carregar mais" — evita renderizar centenas de itens de uma vez.
- Cada item mantém as ações de editar, duplicar ("repetir hoje") e excluir. Editar dentro do modal fecha o modal e abre o formulário já preenchido no card, para não ter dois formulários concorrentes.
- Contador do resultado filtrado ("12 de 87 registros").
- Rolagem interna própria; no celular ocupa quase a tela inteira.

Nada muda no banco, nas permissões ou no conteúdo dos registros — é reorganização de exibição.

## Detalhes técnicos

- `src/components/dashboard/SessionNotesSection.tsx`: extrair o item da lista para um subcomponente reutilizado no card e no modal; o card renderiza `notes.slice(0, 3)`.
- Novo `src/components/dashboard/SessionNotesHistoryModal.tsx` usando `Dialog` (shadcn), recebendo `notes`, `onEdit`, `onRepeat`, `onDelete`; estados locais de busca, período e `visibleCount` (passo de 20).
- Busca e filtro em memória sobre a lista já carregada (a consulta atual já traz tudo em uma chamada). Caso o volume cresça muito, um passo futuro é paginar no servidor — fora do escopo agora.
- i18n pt/en/es para os novos rótulos (histórico completo, buscar, período, carregar mais, contador).
- Sem alterações de esquema, RLS, ou nas funções de IA que consomem `session_notes`.
