

# Pesquisa de Feedback de Serviços da Clínica

## Resumo

Criar um sistema completo de pesquisa de satisfação para clínicas, com perguntas sobre o serviço prestado, o profissional e a clínica em geral. Entregue via link público (gerado pela secretária) ou via chat interno, com pré-seleção do serviço avaliado.

## O que será construído

### 1. Nova tabela `clinic_feedback_surveys`
Armazena cada resposta de feedback com: clinic_id, service_type, professional_id (opcional), respostas às perguntas (JSONB), observação textual livre, status, created_at. RLS: membros da clínica podem ler; qualquer um pode inserir (link público).

### 2. Página pública `/feedback/clinic/:clinicId`
- Rota pública similar ao `/assessment/clinic/:clinicId`
- Aceita query param `?service=pilates&professional_id=xxx` para pré-selecionar
- Layout branded (logo e cor da clínica)
- Fluxo em etapas:
  1. **Identificação** — Nome e email do paciente
  2. **Seleção do serviço** — Dropdown com os serviços cadastrados (fisioterapia, pilates, osteopatia, massoterapia, RPG)
  3. **Avaliação do Serviço** (múltipla escolha + campo texto):
     - Qualidade do atendimento (Excelente / Bom / Regular / Ruim)
     - Resultado percebido (Superou expectativas / Atendeu / Parcialmente / Não atendeu)
     - Recomendaria o serviço? (Sim / Talvez / Não)
  4. **Avaliação do Profissional**:
     - Comunicação e clareza (Excelente / Bom / Regular / Ruim)
     - Pontualidade (Sempre pontual / Geralmente / Às vezes atrasa / Frequentemente atrasa)
     - Acolhimento e empatia (Excelente / Bom / Regular / Ruim)
  5. **Avaliação da Clínica**:
     - Limpeza e organização (Excelente / Bom / Regular / Ruim)
     - Facilidade de agendamento (Muito fácil / Fácil / Difícil / Muito difícil)
     - Ambiente e conforto (Excelente / Bom / Regular / Ruim)
  6. **Observações gerais** — Campo de texto livre
  7. **Agradecimento**

### 3. Geração de link pela secretária
- No `ClinicSecretaryDashboard`, novo card "Pesquisa de Feedback"
- Botão para copiar link genérico
- Opção de gerar link pré-filtrado por serviço (dropdown de serviços)

### 4. Envio via Chat Interno
- No `ConversationList` / `ChatWindow`, adicionar ação "Enviar pesquisa de feedback"
- Ao clicar, seleciona o serviço e envia uma mensagem especial com link clicável para a pesquisa pré-preenchida

### 5. Painel de resultados
- Nova seção no dashboard da secretária: "Feedbacks"
- Cards com NPS-like por serviço, por profissional
- Lista das respostas recentes com filtro por serviço/profissional

## Detalhes técnicos

**Migração SQL:**
```sql
CREATE TABLE public.clinic_feedback_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  service_type text NOT NULL DEFAULT 'fisioterapia',
  professional_id uuid,
  patient_name text,
  patient_email text,
  service_answers jsonb NOT NULL DEFAULT '{}',
  professional_answers jsonb NOT NULL DEFAULT '{}',
  clinic_answers jsonb NOT NULL DEFAULT '{}',
  general_observations text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinic_feedback_surveys ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode submeter feedback (link público)
CREATE POLICY "Anyone can submit feedback"
  ON public.clinic_feedback_surveys FOR INSERT
  TO public WITH CHECK (true);

-- Membros da clínica podem visualizar
CREATE POLICY "Clinic members can view feedback"
  ON public.clinic_feedback_surveys FOR SELECT
  TO authenticated
  USING (is_clinic_member(auth.uid(), clinic_id));
```

**Arquivos a criar/editar:**
- `src/pages/ClinicFeedback.tsx` — Página pública do formulário
- `src/components/dashboard/FeedbackSurveyCard.tsx` — Card da secretária para gerar links
- `src/components/dashboard/FeedbackResultsCard.tsx` — Visualização dos resultados
- `src/components/dashboard/ClinicSecretaryDashboard.tsx` — Integrar os novos cards
- `src/components/chat/ChatWindow.tsx` — Botão de enviar pesquisa
- `src/App.tsx` — Nova rota `/feedback/clinic/:clinicId`

