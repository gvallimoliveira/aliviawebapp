# Reavaliação Customizada — Seleção de Etapas

## Objetivo

Permitir ao profissional/clínica escolher, antes de gerar o link de reavaliação, **quais etapas** o paciente irá preencher. Hoje a reavaliação envia o paciente por todo o fluxo (dados → anamnese → questionários). A ideia é poder, por exemplo, pedir "só os questionários" quando o foco clínico do momento for apenas a evolução das métricas.

## Comportamento desejado

1. No menu "Mais" do prontuário, ao clicar em **Reavaliação**, em vez de gerar o link direto, abre primeiro um modal **"Configurar reavaliação"**.
2. O modal apresenta as etapas como checkboxes:
  - **Dados do paciente** — *obrigatório, sempre marcado e desabilitado* (necessário para vincular a avaliação ao paciente).
  - **Anamnese** (queixa principal, mapa de dor, EVA, cirurgias, atividade) — opcional - porém cada uma dessas métricas pode ser selecionada ou não individualmente. Ou seja, posso escolher apenas mapa de dor dentre os subgrupos da anamnese. 
  - **Questionários validados** — opcional.
  - *(Opcional, baixa prioridade)* **Triagem de Red Flags** — opcional. Hoje a reavaliação já pula essa etapa por padrão; manteremos esse comportamento (desmarcado por padrão).
3. Pelo menos uma etapa opcional precisa estar marcada (caso contrário botão "Gerar link" fica desabilitado, com aviso suave).
4. Ao confirmar, o link é gerado normalmente (curto/longo, copy + WhatsApp como hoje), mas carrega as etapas selecionadas embutidas.
5. No fluxo do paciente:
  - Etapas **desmarcadas** são puladas (não aparecem no Stepper nem na navegação).
  - Etapas **marcadas** seguem com o mesmo pré-preenchimento e destaque de respostas anteriores que existem hoje.
  - Ao finalizar, a nova `assessment` é salva com:
    - Os dados novos das etapas marcadas.
    - **Cópia** dos dados da avaliação original nas etapas puladas (anamnese, pain_regions, test_results), garantindo que o prontuário e o PDF continuem completos.
6. O Stepper passa a mostrar apenas as etapas presentes na reavaliação, mantendo a contagem coerente.

## Onde mexer

### Frontend

- `src/components/dashboard/patient-evolution/PatientDetailView.tsx`
  - Novo state `reassessConfigDialog` (aberto pelo item de menu "Reavaliação").
  - Função `openReassessmentLinkDialog` passa a abrir o modal de configuração; nova função `confirmAndBuildReassessLink(steps)` gera o link só após confirmação.
- `src/components/dashboard/patient-evolution/ReassessmentConfigDialog.tsx` *(novo)*
  - Checkboxes (shadcn `Checkbox`) para anamnese, questionários, (red flags).
  - Item "Dados do paciente" sempre marcado e `disabled`.
  - Botões "Cancelar" / "Gerar link".
- `src/lib/assessmentLinks.ts`
  - `buildReassessmentLink(ctx, reassessmentId, steps?)` aceita lista de etapas e adiciona `&steps=anamnesis,questionnaire` (omitindo se for o padrão completo, para compatibilidade).
- `src/pages/ProfessionalAssessment.tsx` e `src/pages/ClinicAssessment.tsx`
  - Ler `searchParams.get("steps")` → set `enabledSteps: Set<string>`.
  - Lógica de transição entre passos respeita `enabledSteps`:
    - `patient_info` → próximo passo marcado (anamnese se incluída, senão pular para finalização/diagnóstico).
    - `anamnesis` → próximo (questionário se incluído, senão finalizar).
  - Botão "Voltar" também respeita as etapas.
  - Ao salvar a `assessment` final, para cada etapa **não marcada**, copiar do `originalAssessment` os campos correspondentes (`anamnesis_data`, `pain_regions`, `test_results`, etc.). Isso preserva a visualização atual no prontuário/PDF.
- `src/components/assessment/AssessmentStepper.tsx`
  - Aceitar prop opcional `enabledStepIds?: string[]` para filtrar a lista de passos exibida (sem alterar o restante do comportamento).

### Sem mudanças de backend

- Nenhuma alteração em tabelas/edge functions: a customização vive 100% em parâmetros de URL + cópia client-side dos dados originais ao salvar.

## Pontos de cautela

- **Compatibilidade**: links antigos (sem `steps=`) continuam fazendo a reavaliação completa como hoje.
- **Pré-preenchimento existente** (campos da anamnese, mapa de dor, respostas anteriores destacadas nos questionários) **permanece inalterado** quando a etapa é mantida — única mudança é poder ocultar a etapa inteira.
- **Geração de diagnóstico/IA**: continua recebendo um payload completo, porque preenchemos os campos faltantes com a avaliação anterior antes de chamar `generate-diagnosis`.
- **Stepper / textos "etapa X de Y"**: serão recalculados a partir das etapas habilitadas.
- **Reassessment continua skipping Red Flags** por padrão (mantém comportamento atual); o checkbox de Red Flags é meramente opcional e fica desmarcado por default.
- **Validação no modal**: bloquear "Gerar link" se nenhuma etapa opcional estiver marcada (não faria sentido mandar só "dados do paciente").

## Fora do escopo

- Alterações no fluxo de primeira avaliação.
- Alterações nas etapas internas (red flag screening, anamnese, questionários) em si.
- Mudanças no PDF/prontuário — eles continuam funcionando como hoje pois os campos não preenchidos são herdados da avaliação anterior.