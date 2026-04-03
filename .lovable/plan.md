# Reorganizar página de detalhe do paciente — fluxo clínico + venda de tratamento

## Problema atual

A ordem atual é: Gráfico de Dor → Impressão Clínica → Mapa de Dor → Questionários → Histórico (com diagnóstico, anamnese e CTA de tratamento enterrados dentro de cada card individual). O profissional precisa rolar até o final para ver o diagnóstico e o CTA de tratamento fica perdido.

## Nova ordenação proposta

```text
┌─────────────────────────────────────────┐
│ 1. HEADER (nome, badges, botões)        │ ← mantém
├─────────────────────────────────────────┤
│ 2. DIAGNÓSTICO (hipótese principal)     │ ← NOVO card destacado
│    Extraído da avaliação mais recente   │
├─────────────────────────────────────────┤
│ 3. IMPRESSÃO CLÍNICA (IA)              │ ← sobe (já existe)
├─────────────────────────────────────────┤
│ 4. CTA PLANO DE TRATAMENTO             │ ← NOVO card destacado
│    Se não tem tratamento: CTA de venda  │
│    Se tem: badge "Tratamento Liberado"  │
├─────────────────────────────────────────┤
│ 5. EVOLUÇÃO DA DOR (gráfico)           │ ← desce
├─────────────────────────────────────────┤
│ 6. MAPA DE DOR COMPARATIVO             │ ← mantém posição relativa
├─────────────────────────────────────────┤
│ 7. QUESTIONÁRIOS (evolução)            │ ← mantém
├─────────────────────────────────────────┤
│ 8. ANAMNESE (card resumo da última)     │ ← NOVO card independente
├─────────────────────────────────────────┤
│ 9. HISTÓRICO DETALHADO (accordion)      │ ← simplificado, colapsável
│    Cada avaliação: data, score, notas   │
│    PDF/WhatsApp buttons                 │
└─────────────────────────────────────────┘
```

no caso prefiro que o card de anamnese que esta como item 8, suba para item 5. o item 5 assim vira o 6 e assim por diante.  
  
Mudanças técnicas

### Em `src/components/dashboard/PatientEvolutionDashboard.tsx`

**2. Card de Diagnóstico** (novo, ~linhas 876-920):

- Extrair `latestWithDiagnosis` (já calculado em vários pontos — centralizar)
- Card com ícone `Stethoscope`, título "Hipótese Diagnóstica", texto `diagnosis.hypothesis`
- Subtexto: confiança (`diagnosis.confidence`) e reasoning em texto menor
- Se não tem diagnóstico, não renderiza

**3. Impressão Clínica** — apenas mover para logo após o diagnóstico (sem mudança funcional)

**4. Card CTA de Tratamento** (novo, destacado):

- Se última avaliação tem diagnóstico mas SEM tratamento: card com fundo gradient sutil, ícone `Sparkles`, título "Plano de Tratamento Personalizado", descrição curta sobre as 3 fases + STEPS, e o componente `TreatmentUnlockCTA` já existente
- Se TEM tratamento: card verde compacto com "Tratamento Liberado" e botão para visualizar
- Se pagamento pendente: `TreatmentPaidRetry`
- Remove esses CTAs de dentro dos cards individuais do histórico

**5-7.** Gráficos e mapa mantêm lógica atual, apenas reposicionados.

**8. Card de Anamnese** (novo, independente):

- Usar `getAnamnesisFields()` da avaliação mais recente
- Card com ícone `ClipboardList`, título "Anamnese — Última Avaliação"
- Grid 2 colunas com os campos
- Remove a anamnese de dentro dos cards individuais do histórico

**9. Histórico simplificado:**

- Cada card mostra: data, score de dor, hipótese (1 linha), botões PDF/WhatsApp/Ver avaliação
- Notas privadas mantidas
- Questionários individuais mantidos (são por avaliação)
- Usar `Collapsible` para expandir detalhes sob demanda

## Arquivo a alterar

1. `src/components/dashboard/PatientEvolutionDashboard.tsx` — reordenar seções, criar cards de diagnóstico e CTA de tratamento, extrair anamnese, simplificar histórico