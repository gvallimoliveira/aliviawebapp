# Agente de Raciocínio Clínico — Plano (Beta, em standby)

Funcionalidade nova para terapeutas PRO e equipes de Clínica: um chat dedicado, humanizado, com IA que apoia raciocínio clínico baseado em evidências, com vínculo opcional a paciente do prontuário e geração de HEP em rascunho.

**Status inicial:** construído mas desativado por feature flag (`ENABLE_CLINICAL_AGENT = false`) + flag por usuário em `vip_users` para meus testes. Quando você liberar, vira beta visível com selo "Beta" para todos PRO + Clínica.

---

## 1. Nome e identidade

Sem nome confirmado. Sugestões para você escolher depois (não bloqueia o build — começo com placeholder "Agente Clínico Aliv.iA"):

- **Sócrates** — método de perguntas, alinha com "raciocínio em conjunto"
- **Aliv** — extensão direta da marca
- **Íris** — leve, neutro, fácil de lembrar
- **Núcleo** — remete a centro de decisão clínica

Avatar: ilustração custom (gerada), não Sparkles genérico.

---

## 2. Onde fica no app (UX)

- **Nova rota dedicada:** `/agente` (chat em tela cheia, sem outras informações na página).
- **Entrada:** novo item no menu/sidebar do Dashboard chamado **"Agente Clínico"** com badge **"Beta"** dourado, visível apenas em contexto **PRO autônomo** e **Clínica** (oculto no perfil paciente).
- **Atalho contextual:** botão "Discutir este caso com o Agente" dentro do prontuário do paciente (`AssessmentView`) que abre `/agente?patient=<id>` já criando uma thread vinculada.
- **Layout do chat:**
  - Background: logo Aliv.iA grande, centralizada, opacidade ~6%, tom dessaturado (cinza-teal). Gradiente sutil cream→white por trás.
  - Coluna esquerda (desktop) / drawer (mobile): lista de threads, com chip do paciente vinculado quando houver.
  - Centro: mensagens (markdown render), bolhas do usuário em teal, respostas do agente sem bolha (texto direto na superfície warm).
  - Topo: nome da thread + chip paciente + botão "Anexar paciente"/"Trocar paciente".
  - Composer fixo embaixo, com textarea expansível, botão de microfone (reaproveita transcribe-anamnesis) e botão "Gerar HEP" como ação especial.

Visual aprovado pela mem `style/visual-direction` (warm, teal, rounded). Sem alterar core do app.

---

## 3. Acesso e permissões

- **Quem vê:** PRO ativo OR membro de clínica ativa (qualquer papel exceto secretária pura). VIP sempre.
- **Quem NÃO vê:** paciente, profissional sem assinatura, secretária administrativa.
- **Beta:** banner explicativo no topo na 1ª visita ("Versão beta — ainda estamos alimentando a base de evidências. Use como apoio, não como substituto clínico.").
- **Cota:** 30 mensagens/dia por terapeuta (configurável). Contador em `agent_usage_daily(user_id, date, message_count)`. Aviso aos 25, bloqueio aos 30 com CTA "voltar amanhã".

---

## 4. Conversas (threads)

- Múltiplas threads por terapeuta.
- Cada thread pode ser **livre** (discussão geral) ou **vinculada a um paciente** (puxa contexto automaticamente).
- Rota: `/agente/:threadId`. `/agente` resolve a thread mais recente ou cria nova.
- Persistência em banco (database-backed, conforme `chat-agent-ui-contract`).
- Sidebar lista threads ordenadas por `updated_at`, com título auto-gerado pela IA após 3ª mensagem.
- Ações por thread: renomear, arquivar, excluir.

---

## 5. Vínculo com prontuário

Ao vincular paciente, o agente recebe (anonimizado — ver §8):

- Anamnese (queixa, evolução, fatores, atividades).
- Regiões de dor + escores (EVA/regional).
- Diagnóstico atual + hipótese final (com override se houver).
- Resultados de questionários funcionais.
- Impressão clínica e objetivos terapêuticos já gerados.
- Linha do tempo (todas avaliações + dor diary recente).
- HEPs ativos.

Contexto injetado como system message estruturada a cada turno (não na mensagem do usuário), com limite de tokens e resumo automático se >8k tokens.

---

## 6. Geração de HEP pelo agente

- Botão **"Gerar programa HEP"** no composer (só ativa quando thread tem paciente vinculado).
- Agente devolve programa estruturado (lista de exercícios com séries/reps/progressão), salvo em `exercise_programs` com status `draft_from_agent`.
- **Não envia link ao paciente automaticamente.** Aparece como card no chat: "Rascunho criado — revisar e publicar" → abre editor HEP existente.
- Após revisão e clique em "Publicar", vira HEP normal: link funcional + entrada no prontuário com tag "Origem: Agente Clínico (revisado por &nbsp;)".
- Versão original do agente fica preservada em `exercise_programs.agent_draft_json` para auditoria.

---

## 7. Base de conhecimento (evidências)

**Estratégia para beta:** RAG interno + curadoria por nicho via PEDro.

- Nova tabela `knowledge_articles` (id, title, authors, year, journal, pedro_score, study_type, niche_tags[], abstract, key_findings, doi, embedding vector(768), added_by_admin, created_at).
- Filtro obrigatório: `pedro_score >= 7`, prioriza `study_type IN ('meta_analysis','systematic_review')`.
- Pipeline admin (rota `/admin/knowledge`): você define nichos (lombalgia, ombro, joelho etc.); edge function `harvest-pedro-articles` faz scraping/busca na PEDro DB, extrai metadados, calcula embeddings via `google/gemini-embedding-001`, salva candidatos pendentes para aprovação manual.
- No chat: edge function faz embedding da pergunta, retorna top-K artigos relevantes do nicho da conversa, injeta como contexto no prompt e o agente cita com `[Autor, ano, PEDro X]`.
- Mesma base alimenta no futuro outras decisões da IA (treatment, diagnosis), conforme sua visão.

**Fase 1 (build inicial):** schema + admin UI vazia + RAG ligado mas com base vazia (agente responde apenas com STEPS/D.I.F.I até você popular). Harvester PEDro fica como esqueleto para você ativar nicho a nicho.

---

## 8. Privacidade (LGPD)

- Antes de enviar dados do paciente ao modelo: substituir nome completo por iniciais + ID curto (ex: "M.S. #a3f"), remover CPF/telefone/e-mail/endereço.
- Função util `anonymizePatientContext()` aplicada em todo edge function do agente.
- Disclaimer fixo no chat: "Dados do paciente são anonimizados antes do processamento por IA."
- Conversas e mensagens com RLS estrita: apenas autor da thread vê (mesmo dentro da clínica — discussão clínica é pessoal, não compartilhada por padrão).

---

## 9. Stack técnica

- **Frontend:** AI Elements (instalar `conversation message prompt-input shimmer tool`), `useChat` da `@ai-sdk/react`, `DefaultChatTransport` apontando para edge function.
- **Backend:** edge function `clinical-agent-chat` com `streamText`, modelo padrão `google/gemini-3-flash-preview`, `toUIMessageStreamResponse({ originalMessages, onFinish })` salvando assistant message em `agent_messages`.
- **Tools do agente** (AI SDK `tool()`):
  - `fetch_patient_context(patient_id)` — re-puxa contexto se a conversa estender.
  - `search_evidence(query, niche?)` — RAG na `knowledge_articles`.
  - `propose_hep_draft(patient_id, items[])` — cria rascunho (needs approval: false, mas marca como draft).
- `stopWhen: stepCountIs(50)`.
- Gateway via `createLovableAiGatewayProvider` (LOVABLE_API_KEY).

---

## 10. Tabelas novas (migration única)

- `agent_threads` (id, user_id, clinic_id?, patient_id?, title, archived, created_at, updated_at)
- `agent_messages` (id, thread_id, role, parts jsonb, tokens_in, tokens_out, created_at)
- `agent_usage_daily` (user_id, date, message_count) PK composta
- `knowledge_articles` (campos da §7) + extensão `pgvector` se ainda não habilitada
- `agent_settings` (user_id, anonymize_enabled, preferred_niches[]) — defaults seguros

RLS: todas escopadas a `auth.uid()`. GRANTs para `authenticated` e `service_role`. Sem acesso `anon`.

---

## 11. Feature flag e standby

- `src/lib/featureFlags.ts`: adicionar `export const ENABLE_CLINICAL_AGENT = false;`
- Sidebar/menu só renderiza item se `ENABLE_CLINICAL_AGENT || isVip(user)`.
- Rota `/agente` registrada mas redireciona para `/dashboard` se flag off (exceto VIP).
- Edge function deployada mas só responde se chamador for VIP ou flag global ligada (verifica via tabela `app_config`).
- Quando você pedir "libera", troco a flag para `true` em 1 commit.

---

## 12. Otimizações sugeridas (para você avaliar)

1. **Sugestões iniciais (prompt starters):** chips clicáveis como "Discutir hipótese deste paciente", "Sugerir testes funcionais", "Revisar HEP atual", "O que diz a literatura sobre [X]?".
2. **Pin de mensagens importantes** dentro da thread (vira card no prontuário do paciente).
3. **Exportar conversa em PDF** anexado ao prontuário (útil para clínica documentar raciocínio).
4. **Modo "explicação para paciente"** — agente reescreve resposta técnica em linguagem leiga, copiável para WhatsApp.
5. **Comando `/evidência <tema>**` que força busca RAG mesmo fora de discussão de caso.
6. **Histórico de citações** — painel lateral mostra todos artigos citados na thread, com link DOI.
7. **Alertas de red flag** — se na conversa surgir descrição compatível com bandeira vermelha, agente injeta aviso destacado + sugere encaminhamento.
8. **Memória do terapeuta** (longo prazo): preferências de abordagem, abreviações pessoais, salvas em `agent_settings`.

Não implemento todas no build inicial — proponho **1, 4,5 e 7** já no MVP beta; **3, 6** no segundo ciclo; **2, 8** depois.

---

## 13. Suporte e i18n

Atualizar `Support.tsx`, `ClinicSupport.tsx` em pt/en/es com seção "Agente Clínico (Beta)" — apenas quando você liberar a flag. No build inicial deixo strings prontas em `locales/*.json` mas sem renderizar.

---

## 14. Escopo do build inicial (o que entrego nesta primeira leva)

1. Migration com 5 tabelas + RLS + GRANTs + `pgvector`.
2. Feature flag + gate na sidebar/rota (standby total).
3. Rota `/agente/:threadId?` com layout dedicado (background logo dessaturada, AI Elements).
4. Sidebar de threads + criar/arquivar/excluir + título auto-gerado.
5. Vínculo paciente (modal de seleção + chip + injeção de contexto anonimizado).
6. Edge function `clinical-agent-chat` com streaming, tools `fetch_patient_context` / `search_evidence` (RAG vazio inicialmente) / `propose_hep_draft`.
7. Cota diária + contador + aviso.
8. Botão "Gerar HEP" → cria rascunho → card no chat → abre editor existente para revisão/publicação.
9. Atalho "Discutir com o Agente" no `AssessmentView`.
10. Disclaimer beta + disclaimer de anonimização.
11. Admin shell `/admin/knowledge` (CRUD manual de artigos, sem harvester PEDro ainda — fica como TODO marcado).
12. Prompt starters (sugestão 1) + comando `/evidência` (sugestão 5) + injeção de aviso red flag (sugestão 7).

**Fora desta leva (próximos ciclos):** harvester PEDro automatizado, exportar PDF, modo paciente, memória de longo prazo, pin de mensagens.

---

Posso prosseguir com este plano ou quer ajustar algo (nome, escopo da leva, ordem das sugestões, layout)?