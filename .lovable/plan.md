## Problema

Ao clicar em "Falar com o Agente Clínico" no prontuário, a página `/agente` abre mas nenhuma conversa pré-vinculada ao paciente é aberta. Causas prováveis no fluxo atual:

1. **Lookup de paciente falha silenciosamente** em `PatientDetailView.tsx` — o `select id from patients` é filtrado por `clinic_id` *ou* `professional_id`; se a avaliação foi criada em outro contexto (ex.: paciente cadastrado só via assessment sem `professional_id` igual ao atual), retorna `null` e navegamos para `/agente` sem o query param.
2. **`ClinicalAgent.tsx` sempre cria uma thread nova** quando recebe `?patient=<id>` — não verifica se já existe uma thread anterior com esse paciente, então mesmo funcionando o usuário não retoma a conversa existente.
3. **Filtro de 7 dias** no `select` de `agent_threads` esconde threads mais antigas desse paciente — não dá para reabrir.
4. O query param `?patient=` permanece na URL e pode re-disparar criação em re-renders.

## Mudanças

### 1. `src/components/dashboard/patient-evolution/PatientDetailView.tsx`
No handler do item "Falar com o Agente Clínico":
- Tentar o lookup atual (com `clinic_id`/`professional_id`).
- **Fallback**: se vier `null`, repetir o `select id from patients` apenas por `email` (sem filtros de contexto) e usar o primeiro resultado.
- Se ainda assim não houver patient row, mostrar `toast` curto ("Paciente ainda não está vinculado ao prontuário do agente") e abrir `/agente` sem o param (comportamento atual). 

### 2. `src/pages/ClinicalAgent.tsx`
Reescrever o bloco de bootstrap em `useEffect` (linhas ~300-311) para o caso `initialPatientId`:
- Procurar nas `threads` já carregadas a thread mais recente (não arquivada) cujo `patient_id === initialPatientId`.
  - Se encontrar → `setActiveThread(found)` + `navigate('/agente/' + found.id, { replace: true })`.
  - Se não encontrar → chamar `createThread(initialPatientId)` (já navega para `/agente/:id`).
- Em ambos os ramos, remover o query param `?patient` da URL para evitar re-trigger (o `navigate` para `/agente/:id` já faz isso).
- Remover o filtro `.gte("updated_at", sevenDaysAgo)` **só quando** `initialPatientId` está presente, para garantir que threads antigas desse paciente sejam encontradas. Implementação: fazer uma segunda query rápida `select id, title, patient_id, archived, updated_at from agent_threads where user_id = ? and patient_id = initialPatientId and archived = false order by updated_at desc limit 1` antes de decidir abrir/criar.

### 3. Garantir guarda contra re-execução
- Usar um `ref` (`bootstrappedRef`) para que o bloco de bootstrap rode uma única vez por montagem, evitando criar threads duplicadas se o effect re-disparar (StrictMode / mudanças de `activeClinic`).

## Resultado esperado

- Clicar em "Falar com o Agente Clínico" no prontuário da Alessandra:
  - Se já existir uma conversa do agente vinculada a ela (qualquer data) → abre essa conversa.
  - Se não existir → cria uma nova thread já vinculada e abre direto.
- URL final sempre `/agente/<threadId>` com paciente vinculado visível no header da conversa.
- Sem threads duplicadas em recarregamentos.

Nenhuma mudança em edge functions, schema ou business logic — só ajustes de frontend no fluxo de roteamento e lookup.