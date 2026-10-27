# Ajustes: questionários na avaliação preventiva, cartão de alta e "Previsto para hoje"

## 1. Questionários funcionais na avaliação sem dor
**Causa confirmada:** hoje, na avaliação preventiva (sem dor), o fluxo pula a etapa de questionários inteira. Por isso o SPADI não apareceu ao marcar o ombro. A falta de dor não era o critério; o modo preventivo desliga todos os questionários.

**Mudança:**
- Na avaliação preventiva, as regiões marcadas para acompanhamento ou lesão prévia passam a abrir **apenas a parte funcional (atividades do dia a dia)** dos questionários dessas regiões:
  - Ombro: SPADI só com os itens de incapacidade (lavar o cabelo, vestir-se, prateleira alta etc.), sem os 5 itens de dor.
  - Joelho/quadril (KOOS/HOOS): só atividades diárias, esporte e qualidade de vida, sem dor.
  - Coluna lombar (ODI) e cervical: o ODI e o NDI trazem itens de dor dentro do total. Vou listar o que cada questionário mede e só aplicar se ele puder ser usado sem a parte de dor sem perder a validade da pontuação. Caso contrário, a região fica sem questionário (sem pontuação adaptada inventada).
- A pontuação mostra que é **"subescala funcional"**, separada do total, no prontuário, no PDF e no raciocínio. Dor continua como "não coletada", nunca como zero.
- Os testes de dor continuam desligados. A triagem de segurança e os questionários escolhidos pelo profissional ficam como estão.
- Avaliações com dor seguem iguais.

## 2. Cartão "Alta" no macrociclo
- O cartão da alta passa a usar a mesma borda neutra dos outros cartões não selecionados. O verde fica só para marcar que o plano já recebeu alta, para não parecer a fase atual.
- O botão "Registrar alta" e o ícone continuam os mesmos.

## 3. "Previsto para hoje" na Conduta do dia
- Cada atividade vira uma linha própria, sem tudo junto numa frase: nome da atividade à esquerda e, à direita, etiquetas separadas para **minutos** e **PSE**.
- Mais espaço entre as linhas e quebra de linha correta no celular, sem mudar nenhum cálculo nem a recomendação.

## Detalhes técnicos
- `assessment-purpose.ts`: novo `shouldCollectFunctionalQuestionnaires`; `Assessment.tsx` envia o modo preventivo para a etapa de questionários usando `historyRegions` em vez de pular a etapa.
- `questionnaireData.ts` / `QuestionnaireStep.tsx`: filtro por `subscale !== "pain"` quando for preventivo, com pontuação da subescala marcada (`functionalOnly`). Contexto do raciocínio preventivo atualizado para tratar como subescala funcional, não incapacidade por dor.
- `MacroTimeline.tsx` (borda emerald na linha 137) → `border-border`, verde só quando `planStatus === "completed"`.
- `DailyConductCard.tsx`: só o layout da lista de previstos.
- Testes: SPADI preventivo sem itens de dor; fluxo com dor sem alteração. Suporte pt/en/es atualizado sobre questionários funcionais no modo preventivo.
