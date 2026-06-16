# Limitar lista de pacientes (aba Profissional)

## Problema
Hoje em `PatientListView.tsx` os cards de pacientes são renderizados em sequência, sem limite — com 200 pacientes a página fica infinitamente longa.

## Solução proposta
Manter a lógica atual de filtro/ordenação/busca e apenas envolver a renderização dos cards em um **container com altura fixa e scroll interno**, mostrando ~8 cards por vez. Os demais ficam acessíveis via scroll down dentro do container ou via barra de busca (que já existe).

### Mudanças
- **`src/components/dashboard/patient-evolution/PatientListView.tsx`**
  - Envolver o bloco `[...patients].sort(...).filter(...).map(...)` (linhas ~153–…) em um `<div>` com:
    - `max-h-[640px]` (≈ 8 cards de ~80px) no desktop, `max-h-[70vh]` no mobile
    - `overflow-y-auto`
    - `pr-1` para não cortar sombras/scroll
    - `rounded-xl border border-border/40` opcional para indicar "área rolável"
  - Adicionar um pequeno contador acima ("Mostrando X pacientes") para dar contexto quando filtrar.
  - Sem mudanças na lógica de dados, paginação real (todos continuam carregados — já vêm do hook atual), apenas contenção visual.

### Fora de escopo
- Paginação no servidor / lazy loading (não solicitado; a busca + scroll já resolvem a UX para 200 pacientes).
- Mudanças no detalhe do paciente, modal de cadastro, ou modo clínica.

### Detalhes técnicos
A barra de busca (`searchQuery`), os filtros de status (all/active/inactive), os arquivados e o sort A-Z/Recentes permanecem fora do container rolável — assim ficam sempre visíveis enquanto o usuário rola pela lista.
