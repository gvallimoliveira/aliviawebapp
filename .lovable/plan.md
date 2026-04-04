

# Relatório de Evolução / Alta com Comparativo Automático

## Visão geral

Botão "Relatório de Evolução" no header do detalhe do paciente (PatientEvolutionDashboard), visível quando o paciente tem 2+ avaliações com diagnóstico. Ao clicar:
1. Coleta dados comparativos (dor, questionários, regiões) da primeira e última avaliação
2. Envia para edge function que gera resumo narrativo via IA
3. Renderiza PDF de evolução usando o pipeline existente (jsPDF, mesmas margens/tokens visuais)

## Componentes

### 1. Edge Function `generate-evolution-summary`
- Recebe: array de assessments resumidos (datas, pain_score, diagnosis.hypothesis, test_results com questionários, pain_regions)
- Prompt de IA (Lovable AI, gemini-3-flash-preview): "Gere um resumo narrativo de evolução clínica comparando a primeira e última avaliação. Inclua variações percentuais de scores, mudanças nas regiões, e uma conclusão sobre a progressão do quadro."
- Tool calling para output estruturado: `{ narrative: string, painChange: string, questionnaireChanges: { name, firstScore, lastScore, changePercent }[], conclusion: string, recommendation: "discharge" | "continue" | "reassess" }`
- Usa `LOVABLE_API_KEY`, sem JWT

### 2. Função `generateEvolutionPdf` em `src/utils/generatePdf.ts`
Nova função exportada que gera o PDF de evolução:
- **Header**: Logo Aliv.iA + logo profissional (white-label) + título "Relatório de Evolução"
- **Dados do paciente**: Nome, período (data primeira → data última avaliação)
- **Seção Comparativo de Dor**: Tabela lado a lado (primeira vs última) com scores EVA, indicador visual de melhora/piora
- **Seção Questionários**: Para cada questionário presente em ambas, mostrar score inicial → final com % de variação
- **Seção Regiões de Dor**: Listar regiões da primeira e última, destacar removidas (melhora) e adicionadas
- **Resumo Narrativo (IA)**: Bloco com o texto narrativo gerado
- **Conclusão e Recomendação**: Badge visual (Alta / Continuar / Reavaliar)
- Disclaimer de IA no rodapé
- Mesmos tokens visuais (COLORS, MARGIN, SECTION_X, TEXT_MAX_WIDTH, checkPage, renderSectionTitle)

### 3. UI — Botão no PatientEvolutionDashboard
- No header do detalhe do paciente (linha ~901-934), adicionar botão "Relatório de Evolução" com ícone `TrendingUp`
- Visível apenas quando `patient.assessments.filter(a => a.diagnosis).length >= 2`
- Estado de loading durante geração (IA + PDF)
- Fluxo: clique → chama edge function → recebe resumo → gera PDF → download automático

### 4. Compartilhamento WhatsApp
- Após gerar, fazer upload do PDF no bucket `assessment-reports` e oferecer compartilhamento via WhatsApp (mesmo padrão existente)

## Arquivos a criar/alterar

1. **`supabase/functions/generate-evolution-summary/index.ts`** — nova edge function
2. **`supabase/config.toml`** — adicionar `[functions.generate-evolution-summary]` com `verify_jwt = false`
3. **`src/utils/generatePdf.ts`** — adicionar `generateEvolutionPdf` e `generateEvolutionPdfBlob`
4. **`src/components/dashboard/PatientEvolutionDashboard.tsx`** — botão + lógica de geração
5. **`src/locales/pt.json`**, **`en.json`**, **`es.json`** — chaves para labels do relatório

## Riscos identificados e mitigações

- **Paciente com questionários diferentes entre avaliações**: A comparação só lista questionários presentes em AMBAS as avaliações. Os exclusivos de uma são listados separadamente como "aplicado apenas na avaliação X".
- **Dados de test_results inconsistentes**: Usar `normalizeTestResults()` já existente para uniformizar array vs objeto.
- **PDF muito longo**: O comparativo é enxuto por natureza (tabelas, não texto corrido), exceto o resumo narrativo que é limitado pelo prompt (máx 6 linhas).
- **Prompt IA com dados insuficientes**: Se não houver questionários, o resumo foca apenas em dor e regiões. O prompt instrui a IA a trabalhar com o que tiver.

## Ordem de execução

1. Criar edge function `generate-evolution-summary`
2. Atualizar `config.toml`
3. Implementar `generateEvolutionPdf` no pipeline de PDF
4. Adicionar botão e lógica no PatientEvolutionDashboard
5. Adicionar strings de localização

