

# Plano: Agenda Profissional + Prontuário de Evolução

## Visão Geral

Duas funcionalidades interligadas: (1) uma agenda de compromissos no painel profissional para organizar atendimentos, e (2) um prontuário de evolução por sessão na página de detalhes do paciente, acessível também via long-press na agenda.

## Arquitetura

```text
┌─────────────────────────────────────┐
│        ProDashboard.tsx             │
│  ┌───────────────────────────┐      │
│  │ Card "Agenda do Dia"      │      │  ← lista scrollável dos compromissos de hoje
│  │  → clique: /dashboard?    │      │
│  │    tab=agenda              │      │
│  └───────────────────────────┘      │
└─────────────────────────────────────┘
         │ (clique no card)
         ▼
┌─────────────────────────────────────┐
│  ProSchedule.tsx (página agenda)    │
│  Mobile: 3 colunas dias, setas ±3  │
│  Desktop: 7 colunas semana, ±7     │
│  → CRUD de agendamentos            │
│  → clique paciente → detalhe       │
│  → long-press → popup evolução     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  PatientEvolutionDashboard.tsx      │
│  Nova seção: "Prontuário de        │
│  Evolução" com lista por data      │
│  + botão adicionar sessão           │
└─────────────────────────────────────┘
```

## Banco de Dados — 2 novas tabelas

### `professional_appointments`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | |
| professional_id | uuid | ref professionals.id |
| patient_email | text | nullable (compromissos externos) |
| patient_name | text | |
| appointment_date | date | |
| appointment_time | time | |
| duration_minutes | int | default 50 |
| notes | text | nullable |
| type | text | 'video_call', 'in_person', 'external' |
| status | text | 'scheduled', 'completed', 'cancelled' |
| assessment_id | uuid | nullable, link opcional |
| created_at | timestamptz | |

RLS: profissionais só veem/gerenciam seus próprios agendamentos.

### `session_notes` (prontuário de evolução)
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | |
| professional_id | uuid | |
| patient_email | text | chave de agrupamento do paciente |
| appointment_id | uuid | nullable, link opcional |
| session_date | date | |
| content | text | descrição da sessão |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: profissionais só veem/gerenciam seus próprios registros.

## Componentes Novos

### 1. `ProScheduleCard.tsx` — Card resumo no ProDashboard
- Posicionado logo após o card "Link de Avaliação"
- Ícone Calendar, título "Agenda do Dia"
- Lista scrollável (max-h com overflow-y-auto) dos compromissos de hoje
- Cada item: horário + nome paciente + badge tipo (vídeo/presencial)
- Se vazio: "Nenhum compromisso hoje"
- Clique no card → navega para tab agenda

### 2. `ProSchedule.tsx` — Página completa da agenda
- Renderizado como conteúdo da tab "agenda" no Dashboard (nova tab)
- **Mobile (< 768px)**: 3 colunas de dias, setas ← → avançam 3 dias
- **Desktop (≥ 768px)**: 7 colunas (semana), setas ← → avançam 1 semana
- Cada coluna: header com dia/data, lista vertical de compromissos
- Compromisso: card compacto com horário, nome, badge de tipo, indicador de evolução registrada
- **Ações**: botão "+" flutuante ou no header para novo agendamento
- **Modal de agendamento**: data, hora, duração, paciente (autocomplete da lista existente ou nome livre), tipo, notas
- **Edição**: clique no compromisso abre modal preenchido
- **Exclusão**: botão dentro do modal de edição
- **Clique no nome do paciente**: navega para detalhe do paciente
- **Long-press no card**: popup com scroll mostrando evolução daquele dia (session_notes)

### 3. `SessionNotesSection.tsx` — Seção na página do paciente
- Adicionada no PatientEvolutionDashboard, na área de detalhes do paciente
- Lista de sessões ordenada por data mais recente
- Cada item: data, conteúdo resumido, botão expandir
- Botão "Registrar sessão" abre modal com campo de data e textarea
- Edição e exclusão de sessões existentes

## Integração

### ProDashboard.tsx
- Inserir `ProScheduleCard` entre o card de link e os stats cards
- Adicionar nova tab "Agenda" no sistema de tabs do Dashboard

### Dashboard.tsx
- Adicionar suporte ao parâmetro `tab=agenda` para profissionais

### PatientEvolutionDashboard.tsx
- Adicionar seção `SessionNotesSection` na view de detalhes do paciente (quando `selectedEmail` está ativo)

## UX Mobile
- Agenda em 3 colunas com scroll horizontal implícito dentro de cada coluna
- Cards de compromisso compactos (horário em destaque, nome em 1 linha truncada)
- FAB (floating action button) no canto inferior para "+" novo agendamento
- Long-press com feedback visual (scale animation) antes do popup

## Traduções
- Chaves em pt/en/es para todos os textos da agenda e prontuário

## Ordem de Implementação
1. Migration: criar tabelas `professional_appointments` e `session_notes` com RLS
2. Criar `ProScheduleCard.tsx` (card resumo)
3. Criar `ProSchedule.tsx` (página completa)
4. Criar `SessionNotesSection.tsx` (prontuário na página do paciente)
5. Integrar no `ProDashboard.tsx` e `Dashboard.tsx`
6. Adicionar traduções

