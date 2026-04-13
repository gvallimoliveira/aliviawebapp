

## Plano: Campos extras de cadastro de paciente + criação automática via importação

### Situação atual

1. **Agenda (novo paciente)**: Formulário com nome, email, tipo, duração, notas. Ao salvar com paciente novo, cria um registro em `assessments` com `externalPatient: true`. Sem CPF, data de nascimento, telefone ou endereço.

2. **Pré-avaliação**: O formulário de anamnese coleta sexo e faixa etária, mas não CPF nem data de nascimento específica.

3. **Importação de agenda (AI)**: Insere apenas na tabela `professional_appointments`. **Não cria cadastro de paciente** (registro em `assessments`) nem extrai email dos pacientes da imagem. Ou seja, os pacientes importados aparecem na agenda mas **não** aparecem na listagem de pacientes.

### O que será feito

#### 1. Migração de banco: nova tabela `patients`

Criar uma tabela dedicada `patients` para armazenar dados cadastrais completos, separando-os da tabela `assessments` (que não tem colunas para CPF, telefone, endereço, etc.):

- `id`, `professional_id`, `clinic_id`, `full_name`, `email`, `cpf`, `birth_date`, `phone`, `address`, `created_at`, `updated_at`
- RLS: profissionais veem seus pacientes; membros da clínica veem pacientes da clínica
- Unique constraint em `(email, professional_id)` e `(email, clinic_id)` para evitar duplicatas

#### 2. Formulário da Agenda: adicionar campos extras

No modal de criação/edição de agendamento (`ProSchedule.tsx`), quando `selectedPatientKey === "__new__"`, adicionar campos opcionais:
- Data de nascimento
- CPF (com máscara `000.000.000-00`)
- Telefone celular (com máscara `(00) 00000-0000`)
- Endereço

Ao salvar, além de inserir em `professional_appointments`, também inserir/atualizar na tabela `patients`.

#### 3. Listagem de pacientes: adição manual com campos extras

Adicionar botão "Adicionar paciente" na aba de pacientes do `ProDashboard`, abrindo modal com os mesmos campos: nome, email, CPF, data de nascimento, telefone, endereço.

#### 4. Pré-avaliação: adicionar CPF e data de nascimento

No formulário de anamnese (`AnamnesisForm.tsx`), adicionar campos de CPF e data de nascimento. Ao completar a avaliação, salvar esses dados na tabela `patients` (criar registro se não existir).

#### 5. Importação de agenda (AI): criar cadastros de pacientes

No `AgendaImportModal.tsx`, após importar os agendamentos:
- Para cada paciente importado que tenha nome, criar um registro na tabela `patients` (sem email, pois a imagem normalmente não contém)
- Isso fará os pacientes aparecerem na listagem

#### 6. Ajustar ProDashboard para usar tabela `patients`

A listagem de pacientes passa a consultar também a tabela `patients` (merge com dados de `assessments`), mostrando os campos extras quando disponíveis.

### Arquivos afetados

- **Nova migração SQL**: criar tabela `patients` com RLS
- **`ProSchedule.tsx`**: adicionar campos CPF, nascimento, telefone, endereço no modal
- **`ProDashboard.tsx`**: botão "Adicionar paciente" + modal, consulta à tabela `patients`
- **`AgendaImportModal.tsx`**: criar registros em `patients` após importação
- **`AnamnesisForm.tsx`**: adicionar campos CPF e data de nascimento
- **`AssessmentStepper.tsx`** ou fluxo de conclusão: salvar dados na tabela `patients`
- **`PatientEvolutionDashboard.tsx`**: exibir dados cadastrais extras do paciente

