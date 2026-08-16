# Mecanismo de dor + mapa corporal — roteiro segmentado (baixo risco)

Princípios que valem para todos os passos:

1. **Só adicionar, nunca substituir de início.** Cada campo/tabela novo é opcional; avaliação antiga sem os dados continua válida e a UI mostra "não avaliado".
2. **Feature flag por passo** em `src/lib/featureFlags.ts` (ex.: `ENABLE_PAIN_MECHANISM`, `ENABLE_PAINMAP_V2`). Flag desligada = comportamento atual byte a byte.
3. **Um passo = um assunto = um deploy.** Se der problema, basta desligar a flag ou reverter um passo.
4. **Ordem obrigatória:** dados → cálculo puro (testável) → UI → IA → documentos → painéis.
5. **Nada de tocar** em auth, videochamada, push, cliente Supabase ou fluxo de pagamento em nenhum passo.
6. Ao fim de cada passo, um **checklist de não-regressão** fixo: avaliação básica completa, avaliação premium completa, avaliação manual PRO, avaliação por link de clínica, avaliação externa por upload, PDF gerado.

---

## Bloco A — Fundação invisível (nenhuma mudança de tela)

### Passo A1 — Vocabulário e regras em código puro
- Novo arquivo `src/lib/painMechanism.ts`: tipos (`nociceptive | neuropathic | nociplastic | mixed | unknown`), eixo periférico/central, rótulos pt/en/es, descrição leiga e descrição técnica, cor via token semântico.
- Função pura `classifyMechanism(input)` implementando os critérios (Kosek 2021 para nociplástica, Finnerup 2016 para neuropática) e devolvendo mecanismo + confiança + lista de sinais.
- Testes unitários com casos-âncora (lombalgia mecânica, radiculopatia, fibromialgia-like, quadro misto).
- Risco: zero. Nada importa esse arquivo ainda.

### Passo A2 — Extent de dor em código puro
- Função pura `computePainExtent(regions)` → contagem de regiões + peso de superfície por região, usando os ids já existentes em `painMapData.ts`.
- Testes unitários. Nenhuma tela usa ainda.
- Risco: zero.

### Passo A3 — Colunas novas, todas opcionais
- Migração adicionando a `assessments`: `pain_mechanism jsonb` (nullable) e `pain_extent numeric` (nullable). Sem NOT NULL, sem default que altere linhas existentes, sem mexer em policies vigentes.
- Nenhuma escrita ainda; só o espaço existe.
- Risco: baixo. Rollback = ignorar as colunas.

### Passo A4 — Tabela de triagem de sensibilização
- Migração criando `pain_mechanism_screenings` (avaliação, respostas jsonb, escore, faixa) com GRANT + RLS espelhando exatamente as policies já usadas em tabelas filhas de `assessments`.
- Sem uso na aplicação ainda.
- Risco: baixo e isolado (tabela nova não afeta nada existente).

## Bloco B — Coleta (UI nova, atrás de flag)

### Passo B1 — Passo de triagem só no fluxo PRO/manual
- Componente novo `PainMechanismScreening.tsx` (8-10 itens, tri-state sim/não/não sei), inserido apenas no `ManualAssessmentModal`, atrás da flag.
- Grava em `pain_mechanism_screenings` + `pain_mechanism` (resultado da função pura A1). Nada de IA envolvida.
- Escolhemos o fluxo manual primeiro porque é o de menor volume e usado por você mesmo em teste.
- Risco: contido a um fluxo. Flag off restaura o modal atual.

### Passo B2 — Mesma triagem no fluxo premium do paciente
- Versão enxuta com linguagem leiga dentro do `AssessmentStepper`, respeitando a continuidade: se a avaliação básica já respondeu, o passo é pulado (mesma mecânica de reaproveitamento já usada nas red flags).
- Risco: médio-baixo. Único ponto de atenção é a numeração/progresso do stepper — testar retomada de avaliação interrompida.

### Passo B3 — Triagem no fluxo básico (gratuito)
- Versão de 4 itens, para alimentar a hipótese básica e servir de gancho de upgrade.
- Só depois de B2 estar estável em produção por alguns dias.
- Risco: baixo, mas é o fluxo de maior volume — por isso vem por último na coleta.

## Bloco C — Mapa corporal v2 (isolado do resto)

### Passo C1 — Lista de chips espelhando o SVG
- Em `PainMap.tsx`, adicionar coluna/linha de chips sincronizada com as regiões (clique no chip acende o corpo e vice-versa) + contador. Estrutura de dados **inalterada** (`painRegions: string[]`).
- Flag `ENABLE_PAINMAP_V2`.
- Risco: baixo — mudança puramente de apresentação, sem alterar o que é salvo.

### Passo C2 — Extent visível
- Mostrar o extent (A2) no mapa e gravar em `assessments.pain_extent` no submit. Ainda sem uso clínico.
- Risco: baixo.

### Passo C3 — Intensidade por região (mudança de formato — o passo mais delicado)
- Novo formato `{ id, intensity }` guardado em campo **separado** (`pain_regions_detail`), mantendo `painRegions` como está para todo o resto do sistema ler.
- Camada de compatibilidade em `src/lib/anamnesisCompat.ts` para converter nos dois sentidos.
- Só migramos consumidores depois, um a um, se o formato provar valor.
- Risco: este é o único passo com risco real de retrabalho; por isso fica atrás de flag própria e sem substituir o campo antigo.

### Passo C4 — Sensação por região (opcional)
- Tipo de sensação por região (dói / formiga / queima / adormece) alimentando a triagem B1/B2 como evidência topográfica.
- Só se C3 estiver estável.

## Bloco D — IA (uma função por passo, nunca duas juntas)

### Passo D1 — `generate-diagnosis` recebe o bloco
- Bloco de mecanismo entra no prompt como **contexto**, e a função devolve um campo novo `pain_mechanism` no JSON. A hipótese continua rótulo curto de até 20 palavras (regra vigente preservada, é o principal risco a vigiar).
- Fallback: se o campo novo vier ausente/inválido, usa o resultado determinístico de A1. Nunca falha a geração por causa dele.
- Risco: médio — mitigado pelo fallback e pela camada de extração JSON em 4 níveis já existente.

### Passo D2 — `interpret-external-assessment`
- Mesmo tratamento, com atenção extra ao texto bagunçado de arquivos externos.

### Passo D3 — `generate-treatment` sensível ao mecanismo
- Regras de plano por mecanismo: nociplástico → educação em dor, exposição gradual, sono, progressão sem provas de dor; neuropático → progressão mais lenta e cuidado neural; nociceptivo → lógica de carga atual mantida.
- Mantém as restrições já vigentes: sem superfícies instáveis; triagem posicional (joelho irritável não ajoelha).
- Risco: médio. Testar que planos de casos nociceptivos continuam idênticos aos de hoje.

### Passo D4 — Agente clínico e HEP
- `clinical-agent-chat` e `agent-generate-hep` passam a ler o mecanismo do prontuário. Último da fila porque depende de tudo acima.

## Bloco E — Exibição e documentos

### Passo E1 — Badge no resumo e no prontuário
- Badge de mecanismo + uma linha de explicação em `AssessmentSummaryView`, `DiagnosisResult` e no prontuário do paciente. Ausente = nada é exibido.
- Risco: baixo.

### Passo E2 — Seção no PDF
- Seção compacta "Mecanismo predominante de dor" em `generatePdf.ts`, respeitando 158mm úteis e o helper de proteção de títulos órfãos.
- Verificação obrigatória: gerar PDF de avaliação premium **e** de avaliação externa e conferir paginação.
- Risco: médio (PDF é historicamente sensível a paginação) — por isso é um passo isolado.

## Bloco F — Evolução e comunicação

### Passo F1 — Extent no diário de dor e painel multi-condição
- Extent ao lado do EVA, por condição clínica.

### Passo F2 — Impressão clínica e relatório de evolução
- Comentar mudança de mecanismo entre avaliações (ex.: nociplástico → nociceptivo com queda de extent).

### Passo F3 — Suporte e conteúdo
- Atualizar `Support.tsx` + `ClinicSupport.tsx` em pt/en/es (regra do projeto) e produzir o roteiro de Reels "mesma nota de dor, mecanismos diferentes".

---

## Mapa de risco resumido

| Passo | Risco | Rollback |
|---|---|---|
| A1, A2 | nenhum | apagar arquivo |
| A3, A4 | baixo | colunas/tabela ignoradas |
| B1, B2, B3 | baixo/médio | flag off |
| C1, C2 | baixo | flag off |
| C3, C4 | médio (formato) | campo antigo intacto |
| D1–D4 | médio (prompt) | fallback determinístico + revert da função |
| E1 | baixo | flag off |
| E2 | médio (paginação PDF) | revert de um arquivo |
| F1–F3 | baixo | revert de UI |

## Sugestão de agrupamento por sessão de trabalho

- Sessão 1: A1 + A2 + A3 + A4 (tudo invisível, nenhum risco de crash).
- Sessão 2: B1 (só fluxo manual, você testa em si mesmo).
- Sessão 3: C1 + C2.
- Sessão 4: B2, depois B3 em deploy separado.
- Sessão 5: D1, depois D2, depois D3 — um por deploy.
- Sessão 6: E1 + E2.
- Sessão 7: D4 + F1 + F2 + F3.
