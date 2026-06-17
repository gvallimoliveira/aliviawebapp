# Modo Acadêmico — Agente Clínico como Mentor

Disponível para **estudantes (is_student=true) + profissionais PRO assinantes**. Bloqueado para demais (mostra CTA já existente).

## 1. Persona `/professor` no chat

**Onde:** `supabase/functions/clinical-agent-chat/index.ts`

- Detectar comando `/professor` (ou toggle persistente "Modo Mentor 🎓" no header do chat que injeta a persona em todas as mensagens da thread).
- Quando ativo, **substituir/concatenar system prompt** com persona didática:
  - Tom de preceptor experiente, paciente, socrático.
  - Sempre revisa anatomia/biomecânica/fisiopatologia básica antes de avançar.
  - Cita evidência (PEDro ≥7 da base já existente em `agent_knowledge`).
  - Termina respostas com "❓ Quer que eu aprofunde em X, gere um quiz ou um caso clínico?"
- Persistir flag `mentor_mode` na thread (coluna nova em `agent_threads`) para sobreviver a reloads.
- Badge visual "🎓 Modo Mentor" no header da conversa.

## 2. `/quiz` — efêmero no chat

**Onde:** mesmo edge function + UI nova em `ClinicalAgent.tsx`.

- Comando: `/quiz [tema opcional] [n=5]`. Sem tema, agente pergunta.
- LLM gera JSON estruturado (usando `Output.object` do AI SDK — schema pequeno: array de questões com `{enunciado, tipo: 'multipla'|'discursiva', alternativas?, gabarito, justificativa}`).
- Renderizar componente `QuizCard` no chat (tipo tool-result):
  - Uma questão por vez, radio buttons para múltipla / textarea para discursiva.
  - Botão "Próxima" → "Finalizar".
  - Ao finalizar: **score** (X/N), barra de progresso, e gabarito **só das que errou** com justificativa comentada.
  - Discursivas: enviar resposta do aluno + gabarito de volta ao agente para correção qualitativa ("parcial", "completa", "incorreta") com feedback.
- Botão "Tentar outro quiz" e "Estudar este tema" (vira pergunta normal pro agente).
- **Sem persistência** — apenas anexado como `parts` na mensagem do agente naquela thread.

## 3. `/caso` — paciente fictício em aba separada

**Onde:** schema + listagem de pacientes + edge function.

### Schema
- Nova coluna `patients.is_study_case boolean default false` (migration + GRANT preservados).
- Casos de estudo **não entram** em contadores de KPI/clínica, follow-up, billing.

### Edge function
- Comando `/caso [tema]`: LLM gera JSON com dados completos do paciente (nome fictício, idade, queixa, HMA, exames, achados) + um "roteiro pedagógico" salvo em `patients.notes`.
- Insere row em `patients` com `is_study_case=true`, vinculada ao `professional_id` do aluno.
- Retorna no chat: "Criei o caso da Maria, 34a, com tendinopatia patelar. Vá em **Pacientes → Casos de estudo** e me conte: por onde você começaria a avaliação? 🎓"

### Listagem de pacientes
- Em `ProDashboard` / lista de pacientes: nova aba/tab "🎓 Casos de estudo" separada da lista real.
- Filtros: `is_study_case=false` por padrão, `=true` na nova aba.
- Card visual diferenciado (borda âmbar, badge "Caso de estudo").
- Botão "Excluir todos os casos" para limpeza rápida.

## 4. Histórico de desempenho acadêmico

**Onde:** `/minha-conta` (Account.tsx) + nova tabela.

### Schema mínimo (mesmo com quiz efêmero, salvamos só o agregado final)
```
academic_quiz_results (
  id uuid pk,
  user_id uuid fk auth.users,
  topic text,
  total_questions int,
  correct int,
  score_pct numeric,
  created_at timestamptz default now()
)
```
GRANT select/insert para `authenticated` (próprio user via RLS `auth.uid()=user_id`).

### UI
- Card "🎓 Meu desempenho acadêmico" no StudentAccessCard ou aba dedicada.
- Mostra: total de quizzes feitos, % médio, top 3 temas mais fortes, top 3 mais fracos, gráfico de evolução (últimos 10 quizzes).
- CTA "Treinar tema fraco" → abre agente com `/quiz [tema]` pré-preenchido.

## 5. Onboarding / descoberta dos comandos

- No header do `ClinicalAgent`, quando `is_student || (isPro && hasProAccess)`: chip clicável "💡 Comandos do Mentor" abre popover listando `/professor`, `/quiz`, `/caso` com exemplos.
- Mensagem de boas-vindas da thread (quando vazia) inclui os 3 comandos para estudantes.

## Detalhes técnicos

- **AI SDK + Lovable AI Gateway** já em uso. Modelo: `google/gemini-3-flash-preview` (default) para chat; `google/gemini-2.5-pro` para `/quiz` (qualidade da geração estruturada).
- Schema do quiz com `Output.object` enxuto (sem enums longos, sem deep nesting) para evitar limite do Gemini.
- Atualizar `Support.tsx` + `ClinicSupport.tsx` em **pt/en/es** com a nova feature (regra de memória).
- Atualizar memória `mem://features/clinical-agent` (criar) descrevendo os 3 comandos.

## Não incluído nesta onda (fica para depois)
Trilhas por nicho, gamificação/XP/badges, simulado cronometrado, biblioteca compartilhada por instituição, modo "explique no 3º período" vs "residência", flashcards, `/defender`, `/traduzir-artigo`, PDF didático.

## Arquivos afetados (estimativa)
- `supabase/migrations/<nova>.sql` (is_study_case + academic_quiz_results)
- `supabase/functions/clinical-agent-chat/index.ts` (comandos + persona)
- `src/pages/ClinicalAgent.tsx` (toggle mentor, render quiz)
- `src/components/agent/QuizCard.tsx` (novo)
- `src/components/agent/MentorCommandsPopover.tsx` (novo)
- Lista de pacientes (componente atual) — adicionar tab "Casos de estudo"
- `src/pages/Account.tsx` + `StudentAccessCard.tsx` (card desempenho)
- `src/pages/Support.tsx` + `ClinicSupport.tsx` + locales pt/en/es
