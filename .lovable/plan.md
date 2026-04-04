
## Diagnóstico profundo do problema

Os 3 sintomas têm causas reais no código atual, e por isso os ajustes anteriores ficaram “parcialmente certos”, mas não resolveram o problema de forma estrutural.

### 1) Margens ainda falham
A regra de largura máxima foi criada (`TEXT_MAX_WIDTH`), mas não foi aplicada de modo consistente ao layout inteiro:
- alguns blocos ainda usam larguras diferentes (`CONTENT_WIDTH - 30`, `CONTENT_WIDTH - 14`, `CONTENT_WIDTH - 16`, etc.), então o “limite visual da caixa do paciente” não virou uma regra global de composição;
- em listas longas, o texto quebra, mas continua visualmente “espalhado” porque label, conteúdo e bullets não usam o mesmo padding interno;
- há indício visual de renderização ruim com caracteres especiais nos bullets (`✓`, `•`, `×`) e isso piora leitura/alinhamento no PDF.

Pelo anexo, o problema mais visível não é só overflow puro: é também desalinhamento e espaçamento inconsistente, principalmente em “Orientações Gerais” e nos exercícios.

### 2) O design dos questionários não apareceu no PDF
A causa raiz principal está no fluxo premium:
- em `Assessment.tsx`, `handleQuestionnaireComplete` apenas faz `setQuestionnaireResults(results)` e vai para testes funcionais;
- depois, em `handleTestsComplete`, o código salva no banco apenas `test_results: results`, onde `results` são os testes funcionais;
- o PDF renderiza questionários a partir de `testResults`/`assessment.test_results`;
- logo, os questionários da premium não chegam ao export do relatório.

Ou seja: o card bonito foi implementado na UI, mas o PDF não recebe os dados certos no fluxo premium. No profissional isso tende a funcionar melhor porque lá os questionários são persistidos diretamente.

### 3) Títulos separados do conteúdo
Também há causa estrutural:
- `renderSectionTitle` protege só o título + uma estimativa genérica;
- `renderAnamnesisSection` faz `checkPage` item a item;
- resultado: o título “Anamnese” pode cair no final de uma página, e o primeiro campo ir para a página seguinte.

No anexo isso apareceu exatamente assim. O agrupamento de título + primeiro bloco ainda não existe de verdade para todas as seções.

---

## Correção definitiva que eu aplicaria

### A. Transformar o PDF em um renderer por blocos consistentes
Em `src/utils/generatePdf.ts`:
- criar uma regra única de conteúdo interno, por exemplo:
  - `SECTION_INSET_X`
  - `SECTION_TEXT_WIDTH`
  - `LIST_TEXT_WIDTH`
- substituir larguras “locais” por helpers padronizados, para que todo texto dinâmico use a mesma área útil da caixa do paciente;
- normalizar bullets/símbolos problemáticos no PDF para equivalentes estáveis visualmente.

Objetivo: parar de “corrigir ponto a ponto” e impor uma malha única de leitura.

### B. Proteger títulos contra orfandade
Refatorar o padrão de renderização para seções textuais:
- antes de desenhar o título, calcular o espaço mínimo necessário para:
  - título
  - primeiro item / primeiro par label-valor / primeiro parágrafo
- se não couber, quebrar a página antes do título.

Aplicar isso a:
- Anamnese
- Resultados dos Testes / Questionários
- Plano de Tratamento
- Orientações Gerais
- Critérios de Progressão
- quaisquer subseções com título + corpo

### C. Corrigir o pipeline de dados dos questionários na premium
Em `src/pages/Assessment.tsx`:
- persistir os resultados dos questionários no `assessment` assim que eles forem concluídos, ou
- no mínimo, combinar `questionnaireResults + functional testResults` antes de salvar/gerar relatório.

A correção precisa garantir consistência nestes pontos:
- geração do diagnóstico
- geração do plano
- visualização da avaliação
- export PDF
- compartilhamento por WhatsApp
- reabertura posterior via `AssessmentView`

A solução mais segura é tratar `assessment.test_results` como coleção combinada de:
- questionários validados
- testes funcionais

### D. Fazer o PDF dos questionários depender do mesmo modelo visual da UI
No PDF:
- manter o card visual já desenhado, mas fazê-lo consumir os dados corretos;
- renderizar sempre:
  - sigla
  - nome completo
  - porcentagem
  - interpretação
  - grid de subescalas
  - nota da escala
- se a largura da subescala for grande, quebrar por linha dentro da coluna em vez de truncar agressivamente.

Isso aproxima melhor do layout que você aprovou na tela.

### E. Revisar exercícios e orientações gerais
Os problemas visuais do anexo mostram que essa parte precisa de endurecimento:
- nomes de exercícios, categoria, descrição e prescrição devem obedecer à mesma largura útil;
- bullets de orientações gerais devem usar recuo fixo e quebra real de linha;
- evitar caracteres que no font embedding do jsPDF tendem a “espalhar” ou deformar.

---

## Arquivos a ajustar

1. `src/utils/generatePdf.ts`
- padronização real de margens internas
- agrupamento título + conteúdo
- robustez de quebra de linha
- revisão de listas/exercícios/orientações
- card de questionários no PDF com dados corretos

2. `src/pages/Assessment.tsx`
- persistência correta dos questionários no fluxo premium
- combinação de questionários + testes funcionais no armazenamento e no pipeline

3. `src/pages/AssessmentView.tsx`
- validar que a leitura do relatório continue usando o shape combinado sem regressão

4. `src/components/assessment/TreatmentPlan.tsx`
- apenas se necessário para garantir que export/share usem a mesma fonte de dados consolidada

---

## Resultado esperado após a correção

- margens visuais finalmente obedecem a mesma referência em todos os PDFs;
- o card bonito dos questionários aparece no PDF premium e no profissional quando houver questionários;
- “Anamnese” e outros títulos não ficam mais órfãos no fim da página;
- premium, profissional, download e WhatsApp passam a usar o mesmo pipeline consistente de dados.

---

## Ordem de execução recomendada

1. Corrigir persistência e composição de `test_results` no fluxo premium
2. Refatorar o renderer de seções do PDF para agrupar título + primeiro conteúdo
3. Unificar a malha de largura útil e padding interno
4. Revisar blocos críticos do tratamento/orientações gerais
5. Validar premium e profissional contra casos longos como o joelho do anexo
