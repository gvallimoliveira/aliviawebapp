# Adicionar ação "Dados cadastrais" no prontuário do paciente

## Objetivo

Permitir que o profissional consulte e edite os dados cadastrais (nome, e-mail, CPF, nascimento, telefone, endereço) diretamente do prontuário, sem precisar voltar para a lista de pacientes.

## Onde entra

No `DropdownMenu` "Mais ações" do cabeçalho de cada paciente em `src/components/dashboard/patient-evolution/PatientDetailView.tsx`, junto de:

- Falar com o Agente Clínico
- Reavaliação
- Relatório de Evolução

Nova entrada (primeira da lista, antes do Agente Clínico):

- **"Dados cadastrais"** (ícone `UserCog`) — disponível para qualquer paciente, em modo solo e clínica (exceto demo).

## Como funciona o clique

1. Ao abrir o item, faz uma busca em `patients` pelo escopo correto:
  - `clinic_id = clinicId` **ou** `professional_id = professionalId`
  - filtro por `email = patient.email` (fallback `full_name = patient.name` quando não há e-mail)
2. Se encontrar, carrega o registro completo (`id, full_name, email, cpf, birth_date, phone, address`) e abre o `AddPatientModal` em **modo edição** (prop `editPatient` já existente).
3. Se não encontrar (paciente legado, criado só via avaliação), cria o registro mínimo com `full_name`/`email` no mesmo escopo e abre o modal em modo edição para o usuário completar os dados.
4. Ao salvar, o `AddPatientModal` já dispara `reload-pro-patients` e propaga nome/e-mail para `assessments` e `professional_appointments` — não precisa de mudança extra.

## Estados locais a adicionar no `PatientDetailView`

- `registrationModalOpen: boolean`
- `registrationPatient: PatientToEdit | null`
- `registrationLoading: boolean` (para desabilitar o item enquanto busca)

## Permissões / escopo

- Não aparece em `isDemo` (demo profissional / paciente).
- Em clínica, qualquer membro com acesso ao prontuário pode editar (mesmo critério já usado para os outros itens do dropdown).
- Modo paciente (`PatientDetailView` é usado só pelo profissional) — sem mudança.

## Internacionalização

Labels em pt/en/es, inline no item (mesmo padrão dos outros itens do menu):

- pt: "Dados cadastrais"
- en: "Patient details"
- es: "Datos del paciente"

## Arquivos afetados

- `src/components/dashboard/patient-evolution/PatientDetailView.tsx` — novo `DropdownMenuItem`, lookup/insert do paciente, estados e render do `AddPatientModal` reutilizado.
- (Nenhum outro arquivo precisa mudar — `AddPatientModal` já suporta edição via prop `editPatient`.)

## Fora de escopo

- Não alteramos o `AddPatientModal` (apenas o reutilizamos).
- Não criamos botão fora do prontuário (a lista de pacientes já tem o botão "Editar cadastro" próprio).
- Sem mudanças de banco/RLS — as policies de `patients` já cobrem leitura e update por `professional_id`/`clinic_id`.

## Perguntas

Antes de implementar, preciso confirmar **uma** decisão:

**Quando o paciente ainda não tem registro em `patients` (existe só pelo histórico de avaliações), o que prefere?**

- (A) Criar automaticamente o cadastro no escopo atual e abrir o modal para completar — fluxo mais fluido, sem mensagens. *(recomendado, é o mesmo padrão já usado pelo botão "Falar com Agente Clínico")*
- &nbsp;