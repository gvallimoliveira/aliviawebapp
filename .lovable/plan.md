## Plano: Remover hipótese diagnóstica da tela do paciente no fluxo profissional

### Raciocínio

Os dois argumentos são sólidos:

1. Evitar viés clínico — o paciente chegar à consulta com uma "hipótese de IA" pode interferir na relação terapêutica e na avaliação do profissional.
2. Oportunidade comercial — o paciente curioso pode fazer a avaliação básica gratuita por conta própria, conhecendo melhor o app.

A diagnose continua sendo gerada e salva no banco (o profissional precisa dela no dashboard). A mudança é **apenas na UI do paciente**.

---

### Mudanças

**1. `src/pages/ProfessionalAssessment.tsx**`

- Remover o componente `ProfessionalDiagnosisResult` inteiro (ele exibe hipótese, confiança e resumo ao paciente).
- Remover os steps `low_confidence` e `result` da renderização do paciente.
- Após `generateDiagnosis` completar com sucesso, ir direto para um novo step `"thank_you"` em vez de `"result"` ou `"low_confidence"`.
- Criar um componente inline `ThankYouStep` que mostra:
  - Icone de check/sucesso
  - Titulo: "Obrigado por preencher a pré-avaliação!"
  - Mensagem: "Já encaminhamos ao Dr. {nome} os dados coletados e integrados para aumentar a efetividade da sua avaliação presencial."
    &nbsp;
  - Botão "Voltar ao início". retorna a landing page do app. 
- Atualizar o tipo `ProfStep` para incluir `"thank_you"` e remover `"low_confidence"` e `"result"`.

**2. `src/contexts/LanguageContext.tsx**`

- Adicionar chaves de tradução PT/EN:
  - `pro.thankyou_title` — "Obrigado por preencher a pré-avaliação!" / "Thank you for completing the pre-assessment!"
  - `pro.thankyou_desc` — "Já encaminhamos ao Dr. {name} os dados coletados..." / "We've sent Dr. {name} the collected data..."
  - `pro.thankyou_cta` — "Quer conhecer melhor sua dor? Faça uma avaliação gratuita" / "Want to understand your pain better? Take a free assessment"

### O que NÃO muda

- A IA continua gerando a diagnose normalmente (a edge function `generate-diagnosis` é chamada igual).
- O resultado continua sendo salvo na tabela `assessments` com `status: "completed"` e campo `diagnosis` preenchido.
- O profissional continua vendo a hipótese no seu dashboard (`ProDashboard` / `AssessmentView`).
- O fluxo de desbloqueio de tratamento (R$9,90) não é afetado — ele opera no dashboard do profissional.