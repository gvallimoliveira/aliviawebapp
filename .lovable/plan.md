

# Acompanhamento Pos-Avaliacao por Email

## Objetivo
Criar um sistema de lembretes por email que acompanha o usuario apos a avaliacao premium, enviando check-ins nas semanas 1, 2, 4 e 6 para perguntar como esta se sentindo e incentivar a adesao ao plano de tratamento.

## Arquitetura

```text
+-------------------+       +----------------------+       +------------------+
| assessments table  | ----> | follow_up_emails     | ----> | send-follow-up   |
| (completed premium)|       | (schedule tracking)  |       | (edge function)  |
+-------------------+       +----------------------+       +------------------+
                                                                  |
                                                            Lovable AI API
                                                            (email rendering)
                                                                  |
                                                           pg_cron trigger
                                                           (runs daily)
```

## Etapas de Implementacao

### 1. Nova tabela: `follow_up_emails`
Tabela para rastrear quais emails foram agendados e enviados:

- `id` (uuid, PK)
- `assessment_id` (uuid, FK para assessments)
- `user_id` (uuid)
- `email` (text)
- `week_number` (int) -- 1, 2, 4, 6
- `scheduled_for` (timestamptz) -- data calculada
- `sent_at` (timestamptz, nullable) -- null = pendente
- `status` (text) -- pending, sent, failed
- `created_at` (timestamptz)

RLS: usuarios podem ver seus proprios registros de follow-up.

### 2. Agendar follow-ups automaticamente
Quando uma avaliacao premium e concluida (status = "completed"), inserir 4 registros na tabela `follow_up_emails` com as datas de envio:
- Semana 1: +7 dias
- Semana 2: +14 dias
- Semana 4: +28 dias
- Semana 6: +42 dias

Isso sera feito via um **trigger no banco de dados** que dispara quando `assessments.status` muda para "completed" em avaliacoes premium.

### 3. Edge Function: `send-follow-up`
Nova edge function que:
1. Consulta `follow_up_emails` onde `scheduled_for <= now()` e `status = 'pending'`
2. Para cada email pendente, busca os dados da avaliacao (regiao de dor, diagnostico, fase do tratamento correspondente a semana)
3. Usa a Lovable AI API (gemini-2.5-flash) para gerar o conteudo do email personalizado em PT ou EN (conforme idioma do perfil)
4. Envia o email via Resend (ou servico similar)
5. Atualiza `sent_at` e `status` para "sent"

O conteudo do email incluira:
- Saudacao personalizada com o nome do usuario
- Pergunta "Como voce esta se sentindo?"
- Lembrete dos exercicios da fase atual do tratamento
- Link para o app (dashboard) para registrar progresso
- Incentivo motivacional adequado a fase

### 4. Cron Job (pg_cron + pg_net)
Agendar a edge function para rodar **1x por dia** (ex: 9h da manha UTC-3) verificando emails pendentes.

### 5. UI: Opt-in e Historico
- **Opt-in no TreatmentPlan.tsx**: Apos gerar o plano, mostrar um card perguntando se o usuario quer receber lembretes por email. Um switch/checkbox com texto explicativo.
- **Dashboard.tsx**: Adicionar uma secao mostrando os proximos lembretes agendados e os ja enviados, com icones de status.

### 6. Traducoes (i18n)
Adicionar chaves de traducao em ambos os idiomas:
- `followup.opt_in_title` / `followup.opt_in_desc`
- `followup.scheduled` / `followup.sent` / `followup.next_reminder`
- Textos do card no dashboard

## Dependencia: Servico de Email
Para enviar os emails transacionais (nao sao emails de autenticacao), sera necessario integrar um servico como **Resend**. Sera preciso:
- Configurar a API key do Resend como secret
- Ou usar um conector disponivel

Antes de implementar, precisaremos confirmar se voce ja possui uma conta Resend ou preferencia de servico de email.

## Resumo dos Arquivos

| Arquivo | Acao |
|---------|------|
| `supabase/migrations/` | Nova tabela `follow_up_emails` + trigger |
| `supabase/functions/send-follow-up/index.ts` | Nova edge function |
| `supabase/config.toml` | Registrar nova function |
| `src/components/assessment/TreatmentPlan.tsx` | Card de opt-in para lembretes |
| `src/pages/Dashboard.tsx` | Secao de proximos lembretes |
| `src/contexts/LanguageContext.tsx` | Novas traducoes PT/EN |

