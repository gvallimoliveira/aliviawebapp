## 1. Insights do Autônomo — ocupação x faltas

Adicionar um novo card no `InsightsTab` (visível tanto no modo clínica quanto no modo autônomo) chamado **"Ocupação vs Faltas (últimos 30 dias)"**.

- Reaproveitar a lógica de `SecretaryReportsCard` (que já calcula `no_show` e cancelados) e a lógica de ocupação do `get_clinic_kpis` (no modo clínica) / capacidade da agenda do profissional autônomo.
- Para o autônomo: capacidade = nº de slots úteis nos últimos 30 dias com base em `clinics.operating_hours_*` + `working_days` (quando houver) **ou** janela default 08–18h seg–sex × `duration_minutes` (default 50min). Como o `professionals` não tem horários próprios, usar default fixo (08–18h seg–sex, slots de 50min) — documentado no card como "estimativa".
- KPIs no card (responsivos, 2 colunas no mobile):
  1. **Taxa de ocupação %** (atendimentos com status `scheduled` + `completed` ÷ capacidade total no período).
  2. **Taxa de faltas %** (`no_show` + `no_show_justified` ÷ total agendado).
  3. Mini barra horizontal comparando as duas para leitura rápida.
  4. Texto auxiliar: "X faltas em Y atendimentos · Z slots ociosos".
- Cores: ocupação usa `text-primary`; faltas seguem regra atual (>20% destructive, >10% âmbar).

Arquivo novo: `src/components/dashboard/insights/OccupancyVsNoShowCard.tsx`. Render no `InsightsTab` logo abaixo do par Churn/Discharge, em ambos os modos.

## 2. Status visual do atendimento direto no card da agenda

Hoje `professional_appointments.status` aceita `scheduled | completed | cancelled`. Vamos ampliar para suportar **4 estados clínicos** com sombreamento próprio.

### Migration
- Não há CHECK constraint em `status` — apenas ampliar a documentação. Adicionar dois novos valores aceitos pela UI:
  - `completed` → atendimento feito → fundo verde claro (`bg-emerald-100`)
  - `scheduled` → em aberto → fundo branco (`bg-card`)
  - `no_show` → falta → fundo vermelho claro (`bg-red-100`)
  - `no_show_justified` → falta justificada → fundo amarelo claro (`bg-amber-100`)
- O valor `cancelled` antigo permanece compatível (será tratado como faded, sem cor própria).

### UI — `ProSchedule.tsx`
- Atualizar `STATUS_COLORS` para incluir as 4 variações com paleta acima (manter border-l do `service_type`).
- No modal de edição (`editingApt`), substituir o botão único "Marcar concluído" por um **grupo de 4 botões/Toggle Group**: Feito · Em aberto · Falta · Falta justificada — atualiza `status` localmente e via `supabase.update`. Persistir igual ao fluxo atual de `handleMarkComplete`.
- Aplicar mesma lógica visual no `ProScheduleCard.tsx` (card resumo do dashboard) — sombrear pelo status.

## 3. Indicador discreto de evolução feita

Critério de "tem evolução": existe pelo menos uma `assessments` (qualquer tipo) **ou** `professional_notes` criada para aquele paciente na **mesma data** do `appointment_date`. Usar `patient_email` + `professional_id`/`clinic_id` como chave (compatível com a forma como o resto do app identifica paciente).

### Implementação
- Em `fetchAppointments` (já existente no `ProSchedule.tsx`), após carregar appointments, fazer 1 query agregada:
  ```
  select patient_email, date(created_at) as d
  from assessments
  where (professional_id = X or clinic_id = Y)
    and patient_email in (...)
    and created_at between weekStart and weekEnd
  ```
  + query equivalente em `professional_notes` (via join com `assessments` para data, ou usar `updated_at`).
- Montar `Set<string>` com chave `"${email}|${yyyy-mm-dd}"`.
- Passar como prop `hasEvolution: boolean` para `AppointmentCard`.
- Render: pequeno ícone `Pencil` (lucide) `h-2.5 w-2.5` no canto superior direito do card, cor `text-emerald-600`, com `Tooltip` "Evolução registrada".

## Detalhes técnicos

- Sem mudanças de schema obrigatórias; `status` é `text` livre. Só ajustar tipos no front (`type ApptStatus = "scheduled" | "completed" | "no_show" | "no_show_justified" | "cancelled"`).
- Atualizar `SecretaryReportsCard` para somar `no_show + no_show_justified` na contagem de faltas (hoje já conta `no_show`).
- i18n: adicionar chaves `schedule.status_*` em `pt/en/es.json`.
- Card de ocupação consulta `professional_appointments` filtrando últimos 30 dias por `professional_id` (autônomo) ou `clinic_id` (clínica).

## Arquivos afetados

- `src/components/dashboard/insights/OccupancyVsNoShowCard.tsx` (novo)
- `src/components/dashboard/insights/InsightsTab.tsx`
- `src/components/dashboard/ProSchedule.tsx` (status colors, toggle group no modal, ícone de evolução, query auxiliar)
- `src/components/dashboard/ProScheduleCard.tsx` (status colors)
- `src/components/dashboard/SecretaryReportsCard.tsx` (incluir `no_show_justified`)
- `src/locales/pt.json`, `en.json`, `es.json` (novas chaves)

Quer que eu siga assim? Posso também separar o passo 1 do passo 2/3 se preferir entregar em ondas.