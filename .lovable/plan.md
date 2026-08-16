# Mecanismo de dor + mapa corporal aprimorado — roteiro em 5 fases

Objetivo: incorporar a classificação de mecanismo de dor (nociceptiva / neuropática / nociplástica, com eixo central x periférico) e um mapa corporal mais interativo/mensurável, sem quebrar o fluxo atual de avaliação (básica, premium, manual PRO, clínica, externa).

Base científica usada como referência: critérios de dor nociplástica (Kosek et al., 2021), gradação de dor neuropática (Finnerup et al., 2016), Central Sensitization Inventory versão PT-BR, e literatura de *digital pain drawing* / pain extent como desfecho (2020-2024).

---

## Fase 1 — Fundação de dados e vocabulário clínico

O que muda: cria a base para armazenar mecanismo de dor sem alterar telas.

- Nova coluna estruturada em `assessments` para o bloco de mecanismo: mecanismo predominante, mecanismo secundário (dor mista), confiança, sinais que sustentaram a decisão, e sinalizador de sensibilização central.
- Nova tabela de respostas de triagem de sensibilização (CSI reduzido) ligada à avaliação, com escore e faixa interpretativa.
- Campo de `pain_extent` (número de regiões marcadas + percentual de superfície estimada) gravado por avaliação, para virar métrica de evolução.
- Dicionário único de mecanismos em `src/lib/painMechanism.ts`: rótulos, cores semânticas (tokens do design system), descrições curtas para paciente e descrições técnicas para profissional/acadêmico.
- Traduções pt/en/es dos novos rótulos.

Entrega verificável: migração aplicada com GRANT/RLS, tipos regenerados, helper com testes unitários de classificação por regras.

## Fase 2 — Triagem de mecanismo dentro da avaliação

O que muda: passo novo, curto, depois da anamnese e antes dos testes funcionais.

- Bloco de 8-10 itens derivados de instrumentos validados: descritores de dor (queimação, choque, formigamento), distribuição (dermatomal x difusa), proporcionalidade estímulo-resposta, dor espontânea, hipersensibilidade a luz/som/toque, sono e fadiga.
- Regras determinísticas locais fazem a primeira triagem (sem custo de IA): se descritores neuropáticos + distribuição dermatomal → suspeita neuropática; se dor difusa + multissítio + hipersensibilidade multissensorial → suspeita nociplástica; caso contrário nociceptiva.
- Fluxo básico (paciente) recebe versão enxuta com linguagem leiga; fluxo PRO/clínica recebe versão completa com escore CSI e tri-state (sim / não / não sei).
- Continuidade: quem já respondeu na avaliação básica não repete no upgrade premium (mesma regra já usada para red flags).

Entrega verificável: avaliação básica e premium concluídas ponta a ponta em preview, com o bloco aparecendo uma única vez.

## Fase 3 — Mapa corporal: seleção dupla e pain extent

O que muda: `PainMap` e a lista de regiões passam a ser espelhos um do outro.

- Lista de chips ao lado do SVG: clicar no corpo tica o chip, clicar no chip acende a região. Contagem visível de regiões selecionadas.
- Intensidade por região (leve / moderada / intensa) com escala de cor, em vez de marcação binária.
- Camada opcional de tipo de sensação por região (dói / formiga / queima / adormece) — alimenta a Fase 2 com evidência topográfica.
- Cálculo e exibição de *pain extent* como número comparável entre avaliações.
- Manter a semântica anatômica já definida (cervical = posterior, pescoço = anterior) e o refinamento por região existente.

Entrega verificável: screenshots mobile e desktop do mapa com chips sincronizados; extent gravado e visível no resumo.

## Fase 4 — IA, prontuário e PDF

O que muda: o mecanismo entra no raciocínio e nos documentos.

- Prompts de `generate-diagnosis`, `interpret-external-assessment` e do agente clínico recebem o bloco de mecanismo como entrada obrigatória e devolvem campo próprio de mecanismo — sem inflar a hipótese, que continua sendo rótulo curto (máx. 20 palavras).
- Regras de tratamento sensíveis ao mecanismo: quadro nociplástico prioriza educação em dor, exposição gradual e regulação do sono, com carga progressiva sem provas de dor; quadro neuropático prioriza descompressão neural e progressão mais lenta; nociceptivo mantém a lógica atual de carga.
- Prontuário do paciente e resumo da avaliação exibem badge de mecanismo com explicação em uma linha.
- PDF ganha uma seção compacta "Mecanismo predominante de dor" com os sinais que sustentaram a leitura, respeitando os 158mm úteis e a proteção de títulos órfãos.

Entrega verificável: um PDF gerado de avaliação premium e um de avaliação externa, ambos com a seção nova bem paginada.

## Fase 5 — Evolução, painéis e conteúdo

O que muda: o mecanismo e o extent viram acompanhamento e argumento de venda.

- Diário de dor e painel multi-condição passam a mostrar *pain extent* junto do EVA, por condição clínica.
- Impressão clínica e relatório de evolução comentam mudança de mecanismo ao longo do tratamento (ex.: nociplástico → nociceptivo com redução de extent).
- Painel acadêmico: micro-explicações e citações inline dos critérios, como material de estudo.
- Atualização obrigatória de `Support.tsx` + `ClinicSupport.tsx` em pt/en/es na mesma entrega.
- Roteiro de Reels: "mesma nota de dor, mecanismos diferentes" usando o mapa novo.

Entrega verificável: painel pessoal e painel PRO com a métrica nova; páginas de suporte atualizadas nos três idiomas.

---

## Notas técnicas

- Arquivos principais afetados: `src/components/assessment/painMapData.ts`, `PainMap.tsx`, `PainMapView.tsx`, `AnamnesisForm.tsx`, `AssessmentStepper.tsx`, `AssessmentSummaryView.tsx`, `DiagnosisResult.tsx`, `src/utils/generatePdf.ts`, `src/lib/painConditions.ts`, edge functions `generate-diagnosis`, `generate-treatment-plan`, `interpret-external-assessment`, `clinical-agent-chat`, `agent-generate-hep`.
- Nada de superfície instável nas recomendações geradas; triagem posicional (joelho irritável → sem ajoelhar) continua válida e passa a considerar mecanismo.
- Fluxo de videochamada, push e auth permanecem intocados.
- Cada fase é entregável e testável isoladamente; nenhuma fase depende de dados retroativos — avaliações antigas ficam sem mecanismo e a UI trata isso como "não avaliado".

## Ordem sugerida

Fase 1 e 2 na mesma sequência (dados + coleta), depois 3, depois 4, e 5 por último. Se quiser resultado visível mais rápido, invertemos 3 antes de 2.
