# Evolução dos questionários em barras + histórico mais intuitivo

## O que está acontecendo hoje (verificado no código)

Em `PatientEvolutionDashboard.tsx` o gráfico de questionários:

- Agrupa cada questionário por `questionnaireId + contexto anatômico`. Quando a mesma escala é aplicada em avaliações com regiões de dor diferentes, ela se quebra em vários gráficos com **um ponto só** cada — foi o que aconteceu com a Alessandra (eixo X com apenas "28 de mar.").
- Escolhe as "3 maiores limitações funcionais" olhando **apenas a última avaliação**. Na última da Alessandra todas as subescalas vieram 0% (foto 2), então total e subescalas viram séries de valor 0 — o gráfico existe, mas fica visualmente vazio (tudo colado no eixo).

## O que vamos entregar

### 1. Gráfico principal em barras por data (histórico completo)

- Um card por questionário (ex.: NDI), agrupado por **questionnaireId**, não mais fragmentado por contexto. O contexto anatômico passa a aparecer como rótulo/legenda do ponto (tooltip e sublinha do eixo), não como gráfico separado.
- Barras agrupadas por data de avaliação, cada série com cor própria: **Total** (cor primária) + as **3 principais limitações funcionais**, no mesmo padrão visual do gráfico de dor.
- As 3 subescalas destacadas passam a ser escolhidas pelo **pior valor em todo o histórico** (não só na última avaliação), garantindo séries com conteúdo mesmo quando a última avaliação vem 0%.
- Valores 0% ficam legíveis: rótulo numérico no topo de cada barra e altura mínima visível, para nunca parecer gráfico vazio.
- Tooltip por data mostra: total, cada limitação, contexto/região e a interpretação (ex.: "Sem incapacidade").
- Quando existe apenas 1 avaliação, o mesmo gráfico de barras é usado (sem alternância para linha), com uma nota "primeira medição — linha de base".
- Se todas as pontuações do histórico forem 0%, mantemos as barras e acrescentamos uma faixa explicativa: "Sem limitações funcionais registradas neste período".

### 2. Card "Histórico de avaliações" mais óbvio

O bloco hoje chamado "Histórico detalhado — notas privadas por avaliação" será reformulado para deixar claro que ali se abre cada avaliação:

- Novo título: **"Avaliações do paciente — abrir relatório completo"** com contador e subtítulo "Toque em uma avaliação para ver diagnóstico, testes, questionários e PDF".
- Seção passa a vir **aberta por padrão** quando há avaliações.
- Cada item ganha aparência clicável explícita: cursor, hover mais evidente, ícone `ChevronRight` visível e um botão textual **"Abrir avaliação"** (não só o ícone), preservando os botões atuais de WhatsApp/PDF/arquivar/retomar.
- Uma mini-linha do tempo no topo da seção (data + dor + hipótese) permite pular direto para qualquer avaliação.

## Detalhes técnicos

- `src/components/dashboard/PatientEvolutionDashboard.tsx`: reescrever o `useMemo` `questionnaireEvolution` (agrupamento por `questionnaireId`, seleção de subescalas pelo pior valor histórico, campo `contextLabel` por ponto, flag `allZero`).
- `src/components/dashboard/patient-evolution/PatientDetailView.tsx`: substituir a alternância Line/Bar por `BarChart` único com `LabelList`, cores de `SUBSCALE_COLORS`, e reformular o bloco de histórico (título, `defaultOpen`, botão "Abrir avaliação", timeline).
- Sem mudanças de banco, de PDF ou de lógica clínica; apenas apresentação e derivação dos dados já existentes em `test_results`.
- Strings novas em pt/en/es seguindo o padrão atual de `language === "pt" ? ... : ...` usado no arquivo.
