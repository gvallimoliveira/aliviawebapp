# Fase 2 — Modo Acadêmico (Mentor, Trilhas e Gamificação)

Esta fase complementa a Fase 1 (`/professor`, `/quiz`, `/caso`) adicionando descoberta, performance, trilhas de estudo, tradução de artigos e gamificação.

## 1. Popover "Comandos do Mentor" no agente

**Arquivo:** novo `src/components/agent/MentorCommandsPopover.tsx` + integração em `ClinicalAgent.tsx`.

- Botão `HelpCircle` no header (visível só p/ estudantes ou PRO).
- Popover lista todos os comandos com descrição curta e exemplo clicável (insere no input):
  - `/professor` — alterna persona mentor
  - `/quiz [tema] [n]` — quiz interativo
  - `/caso [tema]` — gera paciente fictício
  - `/traduzir [link ou texto]` — tradução PT-BR com PICO + nível de evidência
  - `/trilha [tema]` — abre/cria trilha de estudo
- Mensagem de boas-vindas atualizada apresentando os comandos uma vez por thread.

## 2. Comando `/traduzir`

**Arquivo:** `supabase/functions/clinical-agent-chat/index.ts`.

- Detecta `/traduzir` no início da mensagem.
- Aceita URL (DOI/PubMed/arXiv) ou texto colado.
- Prompt especializado: tradução fiel PT-BR + bloco estruturado:
  - Resumo executivo (3-5 linhas)
  - PICO (População, Intervenção, Comparação, Desfecho)
  - Nível de evidência (Oxford/PEDro estimado)
  - Aplicabilidade clínica
- Resposta em markdown normal (sem componente especial).

## 3. Trilhas de conhecimento por nicho

**Schema novo:**

```
academic_tracks (id, slug, title, niche, description, total_modules, created_at)
academic_track_modules (id, track_id, order_index, title, summary, suggested_command)
academic_user_progress (id, user_id, track_id, module_id, completed_at, xp_earned)
```

- Seed inicial com 5 trilhas (Ombro, Lombar,quadril, Joelho, Cervical), cada uma com 5 módulos  
(conceito → biomecânica → avaliação → tratamento → caso clínico final).
- GRANT padrão + RLS (`auth.uid() = user_id` em progress; tracks/modules `SELECT to authenticated`).

**Arquivo:** novo `src/pages/AcademicTracks.tsx` (rota `/trilhas`) + card de entrada em `Account.tsx`/`StudentAccessCard.tsx`.

- Lista trilhas em cards com barra de progresso.
- Detalhe da trilha: módulos sequenciais; cada módulo tem botão "Estudar com Mentor"
que abre o agente com comando pré-preenchido (ex: `/professor avaliação do manguito rotador`).
- Conclui módulo manualmente ("Marquei como concluído") → gera XP.

## 4. Gamificação XP + Badges

**Schema novo:**

```
academic_xp_log (id, user_id, source, source_ref, xp, created_at)
academic_badges (id, user_id, badge_slug, niche, level, awarded_at)
```

- Fontes de XP:
  - `/quiz` → +10 XP por acerto (gravado pelo QuizCard)
  - `/caso` resolvido → +50 XP
  - módulo de trilha concluído → +30 XP
  - `/traduzir` artigo → +15 XP
- Níveis por nicho (somando XP do nicho):
  - 0-100: "Aprendiz do {nicho}"
  - 101-300: "Praticante do {nicho}"
  - 301-700: "Especialista do {nicho}"
  - 701+: "Mestre do {nicho}"
- Badge é inserido ao cruzar threshold (via trigger ou check no client após gravação).

## 5. Card de desempenho em /minha-conta

**Arquivo:** `src/pages/Account.tsx` (ou `StudentAccessCard.tsx`).

- Aparece se `is_student=true` OU `is_pro`.
- Mostra:
  - XP total e nível geral
  - Lista de badges por nicho ("Mestre do Ombro", "Praticante da Lombar")
  - Mini chart de quizzes (média % por tema, top 3 fortes/fracos) usando `academic_quiz_results`
  - CTA "Treinar tema fraco" → abre agente com `/quiz [tema]`
  - CTA "Ver trilhas" → `/trilhas`

## 6. Atualização das páginas de Suporte (pt/en/es)

**Arquivos:** `src/pages/Support.tsx`, `src/pages/ClinicSupport.tsx` + locales `pt.json`, `en.json`, `es.json`.

- Nova seção "Modo Acadêmico" descrevendo:
  - Comandos do agente (/professor, /quiz, /caso, /traduzir, /trilha)
  - Casos de estudo (aba separada)
  - Trilhas e XP/Badges
  - Card de desempenho em Minha Conta

## Ordem de execução

1. Migração: trilhas + módulos + progress + xp_log + badges + seed.
2. Edge function: adicionar `/traduzir` ao parser.
3. Componentes UI: `MentorCommandsPopover`, `AcademicTracks`, atualizações em `Account` e `ClinicalAgent`.
4. QuizCard: gravar XP em `academic_xp_log` ao finalizar.
5. Suporte (pt/en/es).

## Fora de escopo

Flashcards, `/defender`, simulado cronometrado, biblioteca compartilhada, PDF didático, ranking público entre alunos.