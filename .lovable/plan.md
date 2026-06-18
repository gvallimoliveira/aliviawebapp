# Triagem de Red Flags pré-pagamento + registro probatório

## Objetivo
1. Impedir que o paciente pague a Premium quando há sinais de alerta clínico — encaminhando para assistência médica antes da cobrança.
2. Persistir no banco e no PDF as perguntas e respostas exatas da triagem, com timestamp, para servir como prova de que o usuário preencheu conscientemente.

## Decisão de UX (recap da discussão)
Adotaremos a **Opção A híbrida**: triagem antes do pagamento, com enquadramento positivo, tela de encaminhamento bem feita e opção de revisar respostas antes do bloqueio definitivo. Fluxo PRO/Clínica permanece como está (continua sob ressalva).

## Mudanças por área

### 1. Fluxo Premium self-service (`src/pages/Assessment.tsx`)
- Quando `mode === "premium"` e o usuário está logado: o passo inicial passa a ser **`redflags`** em vez de `payment_check`.
- Texto introdutório da etapa adaptado: "Antes de começar, 5 perguntas rápidas para garantir que a autoavaliação é segura para você agora" (i18n nos 3 idiomas).
- Se passar (todas "não") → segue para `payment_check` (gate de pagamento atual, sem alterações).
- Se marcar qualquer "sim" → vai para `redflag_alert` (tela já existente), com:
  - Botão **"Revisar minhas respostas"** que volta para `redflags` mantendo as respostas.
  - Botão **"Buscar profissional"** que leva para `/professional-search`.
  - Link SAMU 192 (componente `EmergencyBanner` já existente).
  - Campo opcional de e-mail "Quero retomar quando estiver liberado(a) clinicamente" (apenas registra; sem disparo automático nesta fase).
- **Nenhuma cobrança ocorre** até passar pela triagem.

### 2. Fluxo Basic (gratuito)
- Mantém ordem atual (já é triagem antes de qualquer custo). Apenas se beneficia do registro probatório no banco/PDF.

### 3. Fluxo PRO / Clínica / Manual
- **Não muda.** Continua aplicando a regra "sob ressalva" já documentada na memória do projeto.

### 4. Persistência probatória (banco)
A coluna `assessments.red_flags` (jsonb) já existe. Vamos padronizar o formato salvo, incluindo prova de preenchimento:

```json
{
  "version": 1,
  "answered_at": "2026-06-18T14:22:01Z",
  "language": "pt",
  "user_agent": "...",
  "answers": [
    { "key": "redflags.trauma", "question": "...texto exato exibido...", "answer": "no" },
    { "key": "redflags.recent_surgery", "question": "Realizou cirurgia...", "answer": "yes" }
  ],
  "any_positive": true,
  "outcome": "blocked_premium_payment" | "passed" | "dismissed_by_professional"
}
```

Para casos pré-pagamento bloqueados, criamos um registro leve em `assessments` com `status = 'red_flagged'`, `type = 'premium'`, `payment_status = 'pending'`, sem cobrança — serve como auditoria. Isso já é compatível com o CHECK constraint atual.

### 5. PDF do relatório (`src/utils/generatePdf.ts`)
Nova seção **"Triagem de sinais de alerta (Red Flags)"** sempre presente quando `assessment.red_flags` existir, contendo:
- Data/hora do preenchimento.
- Tabela: Pergunta | Resposta (Sim/Não).
- Quando houver "Sim": bloco destacado com a recomendação dada ao paciente + nota "O paciente reconheceu ter lido a orientação de buscar assistência médica antes de prosseguir".
- Quando dispensado por profissional: nome, data e justificativa (campos `red_flags_dismissed_*` já existentes).
- Respeitar margem útil de 158mm e regras anti-órfão de título (memória de PDF).

### 6. Internacionalização
Adicionar chaves em `pt.json`, `en.json`, `es.json`:
- `redflags.premium_intro` (enquadramento positivo)
- `redflags.review_answers`
- `redflags.want_followup_email`
- `redflags.pdf_section_title`
- `redflags.pdf_acknowledgement`

### 7. Componentes a alterar
- `src/pages/Assessment.tsx` — reordenação de passos no modo premium.
- `src/components/assessment/RedFlagScreening.tsx` — montar payload com `question` (texto traduzido exibido) + `key` + `answer`; aceitar respostas pré-preenchidas ao voltar.
- `src/components/assessment/RedFlagContinueScreen.tsx` — adicionar botão "Revisar respostas" e campo opcional de e-mail.
- `src/utils/generatePdf.ts` — nova seção.
- `src/locales/{pt,en,es}.json` — chaves novas.

## Detalhes técnicos
- Não precisa de migração: `red_flags jsonb` já existe.
- O envio do payload acontece no `handleRedFlagComplete` existente; passa a chamar um upsert em `assessments` antes do gate de pagamento no fluxo premium (registro leve, sem cobrança).
- RLS atual de `assessments` já cobre `user_id = auth.uid()`, então o registro pré-pagamento pertence corretamente ao usuário logado.
- Sem alterações em edge functions de pagamento — a função `create-payment` simplesmente não é chamada se a triagem bloquear.

## Fora de escopo (deixar para depois, se quiser)
- Disparo automático de e-mail de retorno (Lovable Cloud transactional).
- Dashboard administrativo das triagens bloqueadas.
- Estorno automático (descartado na conversa).

## Validação após implementação
- Premium logado + todas "não" → continua até pagamento normalmente.
- Premium logado + 1 "sim" → vê tela de encaminhamento, sem cobrança; pode revisar e mudar respostas.
- Basic + qualquer "sim" → comportamento atual mantido.
- PDF gerado mostra a seção de triagem com Q&A exatos.
- Registro no banco contém `answers[]` com texto da pergunta exibido.
