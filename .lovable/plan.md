# Análise cardiovascular e relatório especial

## Objetivo
Transformar as sessões monitoradas (FC média, FC máx., tempo nas zonas, duração) numa análise gráfica com interpretação, comparada a metas de diretrizes, e num relatório especial em PDF. Público: pacientes cardiovasculares, praticantes de esporte e atletas. Interpretação por regras clínicas fixas, sem gastar créditos. Sempre como sugestão, nunca diagnóstico.

## O que o fisioterapeuta verá

### 1. Novos campos (opcionais) na sessão monitorada
- **FC 1 min após o esforço**: calcula a recuperação cardíaca (FC máx. menos FC 1 min).
- **Distância, ritmo ou potência**: o ritmo sai sozinho de distância × duração; a potência média (W) é para bicicleta ou ergômetro.
- No card do teto: um botão **"Usa betabloqueador"**. Quando ligado, a análise usa o esforço percebido (PSE/Borg) como guia principal e mostra a FC só como apoio.
- Os mesmos campos aparecem no atalho do microciclo e na leitura por print.

### 2. Análise da sessão (ao abrir uma sessão monitorada)
- Gráfico do tempo em cada zona (Z1–Z5), com a zona prescrita destacada pelo perfil.
- % do tempo acima do teto de FC.
- FC média e máxima como % da FC máx. estimada e do teto.
- **Coerência esforço × coração**: TRIMP comparado ao sRPE. Exemplo: "o coração trabalhou mais do que o paciente percebeu".
- **Recuperação no 1º minuto**: queda de 12 bpm ou menos aparece como atenção (Cole, NEJM 1999).
- SpO₂ mínima abaixo de 92% e FC acima do teto aparecem como avisos.

### 3. Painel "Análise cardiovascular" no prontuário
Fica no bloco de carga e periodização, recolhido por padrão, com o período escolhido na hora (4, 8 ou 12 semanas):
- **Meta semanal da OMS 2020**: minutos moderados (Z2–Z3) e vigorosos (Z4–Z5) por semana comparados a 150–300 min moderados ou 75–150 min vigorosos (1 min vigoroso = 2 min moderados).
- **Distribuição de intensidade**: para atleta e saudável/ativo, compara a semana com o modelo polarizado de cerca de 80% leve e 20% intenso (Seiler). Para os perfis clínicos, mostra o % de sessões dentro da zona prescrita.
- **Tendências**: TRIMP semanal, FC de repouso ao acordar, recuperação no 1º minuto e eficiência (FC média para o mesmo ritmo ou potência). Se a FC cai no mesmo ritmo, é sinal de melhora do condicionamento.
- ACWR do cardio e a matriz FC de repouso, que já existem, reaproveitados aqui.
- Uma lista curta de **leituras do período**, por exemplo: "3 de 8 sessões passaram do teto", "meta da OMS cumprida em 3 de 4 semanas", "recuperação melhorou de 14 para 21 bpm".

### 4. Metas por perfil
| Perfil | Zona/intensidade-alvo | Fonte |
|---|---|---|
| Cardiopata sob restrição | Moderada, Borg 11–13, abaixo do teto de 65% | Diretriz SBC Reabilitação 2020, ACSM 2021 |
| Hipertenso controlado | Moderada, 150 min/sem, abaixo do teto de 70% | Diretriz Brasileira de Hipertensão 2020, ACSM |
| Sedentário | Progressão até 150 min/sem moderados | OMS 2020 |
| Saudável / ativo | 150–300 min moderados ou equivalente | OMS 2020 |
| Atlético | Polarização de cerca de 80/20, progressão de carga | Seiler 2010, Gabbett 2016 |

### 5. Relatório especial em PDF (duas versões)
Botão **"Relatório cardiovascular"** no painel, com o período escolhido:
- **Versão técnica (fisioterapeuta / cardiologista)**: dados do paciente, perfil e teto, tabela de sessões, gráficos de zonas, meta × realizado, tendências, alertas, leituras do período, ressalvas (betabloqueador, desvio das fórmulas por idade) e referências.
- **Versão do paciente**: linguagem simples, como "Seu coração está se recuperando mais rápido", com metas em minutos por semana, os pontos de atenção e as orientações (teto e oxímetro). Pode ser baixada ou compartilhada pelo WhatsApp.
- Segue as regras de PDF do projeto: largura útil de 158 mm, títulos protegidos contra ficar sozinhos no fim da página e logo do profissional.

### 6. Suporte
Atualizar o FAQ do Suporte profissional e do Suporte da clínica (pt/en/es) explicando a análise, as metas e o relatório.

## Fora do escopo
- Integração direta com fabricantes de monitor; sem citar marcas.
- Diagnóstico ou liberação para exercício: o relatório recomenda avaliação médica quando houver alerta.

## Detalhes técnicos
- Migração: `srpe_entries` ganha `hr_recovery_1min`, `distance_km`, `avg_power_w` (numéricos, nulos). `periodization_plans` ganha `beta_blocker boolean default false`. As políticas e GRANTs atuais continuam valendo.
- `saveProfessionalSession`, `ProfessionalCardioEntry`, o atalho do `MicroWeekGrid` e `pro_parse_cardio_print` (extração dos novos campos quando existirem no print) recebem os novos campos.
- Novo módulo puro `src/lib/cardioAnalysis.ts`: zonas por sessão, % acima do teto, coerência TRIMP/sRPE, recuperação de FC, minutos moderados/vigorosos por semana vs OMS, distribuição polarizada, aderência à zona prescrita por perfil, eficiência FC/ritmo e frases de interpretação geradas por regras. Com testes unitários. Mesmo dado sempre gera o mesmo texto.
- Metas e referências centralizadas em `cardioSafety.ts`/`cardioAnalysis.ts` (fonte única).
- Componentes: `CardioAnalysisPanel.tsx` (recolhido, seletor 4/8/12 semanas, gráficos Recharts com tokens de cor do tema), `CardioSessionAnalysis.tsx` (por sessão). Todos os botões com `type="button"` e sem salto de página.
- PDF: `src/utils/generateCardioReportPdf.ts`, duas variantes (técnica e paciente), reaproveitando fontes e utilitários de `generatePdf.ts`.
- A janela do relatório busca os dados sob demanda e nunca altera a matemática de risco (ACWR).
- Registrar a regra em AGENTS.md: a análise cardiovascular e o relatório derivam só de `cardioAnalysis.ts`.
