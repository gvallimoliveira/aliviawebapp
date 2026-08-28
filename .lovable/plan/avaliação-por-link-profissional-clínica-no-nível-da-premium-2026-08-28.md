# Avaliação por link profissional/clínica no nível da premium

## Resposta curta

Não é preciso trocar o fluxo do link pelo fluxo premium. O premium carrega coisas que não cabem no link (checagem de pagamento, conta obrigatória do paciente, geração de plano de tratamento para o próprio paciente). A diferença clínica real entre os dois é **uma etapa: testes funcionais**. Os questionários por região do mapa de dor **já existem** no link profissional e no link de clínica — usam exatamente o mesmo componente do premium.

Complexidade do ajuste: baixa. É adicionar uma etapa opcional já pronta em dois arquivos de página, sem tocar em nada do fluxo premium nem no motor de diagnóstico (que já aceita `testResults`).

## O que será feito

### 1. Etapa de testes funcionais (opcional e pulável)

Entra depois dos questionários, antes da geração da hipótese, nos dois fluxos por link:

```text
Boas-vindas → Dados → Triagem (red flags) → Anamnese
   → Questionários (mapa de dor) → [Testes funcionais — pulável]
   → [Perfil FABQ, se ligado] → Hipótese enviada ao profissional
```

- Botão "pular" visível: quem não quiser fazer segue direto, como hoje.
- Resultados salvos na avaliação e enviados à IA, então já aparecem no prontuário e no PDF (o relatório já tem seção de testes).
- Nenhuma mudança para links já compartilhados: o passo é aditivo e opcional.

### 2. Investigar por que os questionários não apareceram no seu teste

A etapa existe, mas há dois motivos possíveis para ela ter passado batido:

- As regiões marcadas no mapa não tinham questionário mapeado — nesse caso a tela mostra "Não há questionários específicos" com um único botão "Continuar", que passa rápido e parece que nada aconteceu.
- Diferença de nomenclatura entre os IDs de região do mapa de dor e os IDs esperados no mapeamento dos questionários.

Vou reproduzir o caminho do link com as mesmas regiões que você usou e corrigir a causa que aparecer (mapeamento de região faltante ou tela vazia mal comunicada). Se for região sem questionário, a tela passa a explicar melhor em vez de parecer uma etapa fantasma.

### 3. Melhorar a escolha dos questionários no link

Hoje o fluxo por link não envia ao seletor as notas de dor por região nem as limitações funcionais relatadas, então a priorização dos 2 questionários é menos precisa que no premium. Vou passar esses dados (igual ao premium), sem mudar a quantidade de questionários.

### 4. Barra de etapas e toggles

- O indicador de progresso passa a mostrar "Testes" no modo profissional.
- Nos links de reavaliação, "testes funcionais" entra na lista de etapas que você liga/desliga ao gerar o link (desligado por padrão, para não alterar comportamento atual).

## Detalhes técnicos

- `src/pages/ProfessionalAssessment.tsx` e `src/pages/ClinicAssessment.tsx`: novo step `functional_tests` entre `questionnaire` e `psychosocial`/`generateDiagnosis`; reaproveita `FunctionalTests` (`onComplete`/`onBack`, com skip); grava `assessments.test_results` junto dos questionários e passa `testResults` ao `generate-diagnosis` (hoje enviado como `[]`).
- `QuestionnaireStep`: passar `painScoresPerRegion`, `generalPainScore` e `extraQuestionnaireRegions` nos dois fluxos por link.
- `AssessmentStepper`: incluir `functional_tests` em `PROFESSIONAL_STEPS`.
- `src/lib/reassessmentSteps.ts`: novo id `functionaltests`, fora do default.
- Sem migração de banco: `test_results` já é usado pelos questionários e pelo PDF.
- Fluxo premium (`src/pages/Assessment.tsx`) não é tocado.

## Verificação antes de encerrar

- Teste automatizado do fluxo por link cobrindo: pular os testes, responder os testes, e região sem questionário aplicável.
- Conferir no prontuário e no PDF que os testes respondidos aparecem.
