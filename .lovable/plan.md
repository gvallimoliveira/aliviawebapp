

# Revisao do fluxo de mensagens: permissoes e filtros

## Problemas identificados

### 1. Filtros invertidos no MessagesTab
Quando um profissional clica no filtro "Pacientes", o componente mostra `ConversationList mode="patient"` -- que exibe as conversas onde o usuario e paciente (falando com profissionais). O correto seria mostrar as conversas com seus pacientes (mode="professional"). Os filtros estao semanticamente invertidos.

### 2. Popup "iniciar conversa" mostra contatos errados
Consequencia do problema acima: ao clicar "Pacientes" e depois "Iniciar conversa", o popup carrega profissionais em vez de pacientes.

### 3. Permissoes de inicio de conversa incompletas
Regras desejadas:
- **Paciente comum** (busca profissional no marketplace): so o paciente inicia
- **Profissional solo** que recebeu pre-avaliacao de paciente com conta Alivia: ambos podem iniciar
- **Clinica**: ambos podem iniciar

Situacao atual:
- Clinic mode: `canInitiateConversation=true` -- OK para o lado profissional, mas o lado paciente tambem permite iniciar (default true no ConversationList)
- Solo mode: `canInitiateConversation=false` -- impede o profissional de iniciar, mas permite o paciente iniciar sem restricao
- Personal mode: `canInitiateConversation=false` -- correto parcialmente, mas paciente comum do marketplace consegue iniciar conversa pelo ConversationList default

---

## Plano de correcao

### 1. Corrigir filtros no MessagesTab

Inverter a logica dos filtros para que correspondam a expectativa do profissional:
- Filtro **"Pacientes"** → mostra `ConversationList mode="professional"` (conversas do profissional com seus pacientes)
- Filtro **"Profissionais"** → mostra `ConversationList mode="patient"` (conversas onde o usuario e paciente)

### 2. Ajustar permissoes por contexto

**MessagesTab** passara `canInitiateConversation` corretamente para cada ConversationList:

| Contexto Dashboard | ConversationList mode="professional" (com pacientes) | ConversationList mode="patient" (com profissionais) |
|---|---|---|
| Clinica | canInitiate = true | canInitiate = true (paciente com vinculo) |
| Solo | canInitiate = true (pacientes com conta) | canInitiate = false (so responde) |
| Pessoal (sem perfil pro) | N/A | canInitiate = true (marketplace) |

### 3. Refinar logica de contatos no popup

Na funcao `loadPatientsForNewConv` do ConversationList:
- **mode="professional"**: ja busca pacientes com `user_id` nas assessments do profissional -- correto
- **mode="patient"**: ja busca profissionais das assessments do usuario -- correto
- Adicionar filtro para excluir contatos com quem ja existe conversa ativa (melhoria UX)

### 4. Ajustar `canInitiateConversation` no Dashboard.tsx

- **Clinic mode** (linha 499): passar prop separada ou ajustar MessagesTab para receber permissoes granulares por modo
- **Solo mode** (linha 532): mudar `canInitiateConversation` para `true` -- profissional solo pode iniciar com pacientes que tem conta
- **Personal mode** (linha 550): manter `canInitiateConversation=false` para o lado profissional (nao tem); para o lado paciente, permitir apenas com profissionais do marketplace

---

## Arquivos a modificar

1. **`src/components/dashboard/MessagesTab.tsx`**
   - Inverter mapeamento dos filtros
   - Passar `canInitiateConversation` separado para cada ConversationList (pro vs patient)
   - Aceitar props mais granulares: `canInitiateAsPatient` e `canInitiateAsProfessional`

2. **`src/components/chat/ConversationList.tsx`**
   - Sem mudancas estruturais grandes; a logica de `loadPatientsForNewConv` ja esta correta por modo
   - Pequeno ajuste: filtrar contatos que ja possuem conversa ativa

3. **`src/pages/Dashboard.tsx`**
   - Ajustar props passadas ao MessagesTab por contexto (clinic, solo, personal)

4. **`mem://features/internal-messaging`**
   - Atualizar regras de permissao documentadas

---

## Detalhes tecnicos

A interface do MessagesTab sera expandida:
```typescript
interface MessagesTabProps {
  professional?: any;
  initialConversationId?: string | null;
  canInitiateAsPatient?: boolean;    // pode iniciar conversa como paciente
  canInitiateAsProfessional?: boolean; // pode iniciar conversa como profissional
}
```

Dashboard passara:
- Clinic: `canInitiateAsPatient={true}` + `canInitiateAsProfessional={true}`
- Solo: `canInitiateAsPatient={false}` + `canInitiateAsProfessional={true}`
- Personal: `canInitiateAsPatient={true}` + `canInitiateAsProfessional={false}`

