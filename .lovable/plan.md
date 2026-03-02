# Tabela Comparativa Atualizada + Destaques na Landing + Marketplace de Profissionais

## Parte 1: Atualizar a Tabela Comparativa

Adicionar novas linhas na tabela de comparacao Basic vs Premium:


| Recurso                              | Basic  | Premium |
| ------------------------------------ | ------ | ------- |
| Diario de Dor                        | X      | Check   |
| Comparacao Antes/Depois              | X      | Check   |
| &nbsp;                               | &nbsp; | &nbsp;  |
| Indicacao de Profissional Presencial | X      | Check   |


**Arquivos**: `ComparisonSection.tsx`, `LanguageContext.tsx` (novas chaves i18n)

---

## Parte 2: Destaques na Landing Page (nova secao)

Criar uma nova secao `HighlightsSection.tsx` posicionada entre `StatsSection` e `ComparisonSection` na landing page. Sera um grid de 4 cards destacando:

1. **Diario de Dor** - Acompanhe sua evolucao diaria com graficos de progresso
2. **Questionarios Validados** - KOOS, SPADI, ODI, VISA-A usados por clinicas e pesquisadores
3. **Avaliacao baseada em evidencias** - Resolva suas dores musculoesqueleticas sem sair de casa
4. **Conexao com profissional** - Se precisar de acompanhamento presencial, encontre fisioterapeutas na sua regiao

Cada card tera um icone, titulo e descricao curta. Layout responsivo: 2 colunas mobile, 4 desktop.

**Arquivos**: novo `src/components/HighlightsSection.tsx`, `Index.tsx`, `LanguageContext.tsx`

---

## Parte 3: Marketplace de Profissionais

### 3.1 Banco de Dados

Nova tabela `professionals`:


| Coluna         | Tipo                   | Descricao                                     |
| -------------- | ---------------------- | --------------------------------------------- |
| id             | uuid (PK)              | &nbsp;                                        |
| user_id        | uuid (NOT NULL)        | Referencia ao auth user                       |
| full_name      | text (NOT NULL)        | Nome completo                                 |
| crefito        | text                   | Registro profissional                         |
| specialties    | text[]                 | Ex: ["ortopedia", "esportiva", "neurologica"] |
| city           | text (NOT NULL)        | Cidade                                        |
| state          | text (NOT NULL)        | Estado (UF)                                   |
| bio            | text                   | Descricao curta                               |
| phone          | text                   | Contato (WhatsApp)                            |
| email          | text                   | Email profissional                            |
| clinic_name    | text                   | Nome do consultorio/clinica                   |
| clinic_address | text                   | Endereco completo                             |
| active         | boolean (default true) | Se aceita novos pacientes                     |
| created_at     | timestamptz            | &nbsp;                                        |
| updated_at     | timestamptz            | &nbsp;                                        |


RLS:

- SELECT: qualquer usuario autenticado pode ver profissionais ativos
- INSERT/UPDATE: apenas o proprio profissional (user_id = auth.uid())

Nova tabela `professional_referrals` (registro de indicacoes):


| Coluna          | Tipo                            | Descricao                     |
| --------------- | ------------------------------- | ----------------------------- |
| id              | uuid (PK)                       | &nbsp;                        |
| patient_user_id | uuid (NOT NULL)                 | Paciente que solicitou        |
| professional_id | uuid (FK professionals)         | Profissional indicado         |
| assessment_id   | uuid (FK assessments, nullable) | Avaliacao relacionada         |
| status          | text (default 'pending')        | pending, contacted, completed |
| created_at      | timestamptz                     | &nbsp;                        |


RLS:

- Paciente pode ver e criar suas proprias indicacoes
- Profissional pode ver indicacoes direcionadas a ele

### 3.2 Pagina de Cadastro do Profissional

Nova pagina `/professional/register` com formulario:

- Nome, CREFITO, especialidades (multi-select), cidade, estado, bio, telefone, email, clinica
- Requer autenticacao (redireciona para /auth se nao logado)
- Salva na tabela `professionals`

### 3.3 Pagina de Busca de Profissionais

Nova pagina `/professionals` acessivel a usuarios autenticados:

- Filtro por estado e cidade
- Filtro por especialidade
- Lista de cards com: nome, especialidades (badges), cidade/estado, bio, botao "Entrar em contato"
- Botao de contato abre link WhatsApp ou mostra email/telefone
- Ao clicar "Solicitar indicacao", cria registro em `professional_referrals`

### 3.4 Integracao no Fluxo do Paciente

No componente `DiagnosisResult.tsx` e/ou `TreatmentPlan.tsx`, apos o resultado:

- Card com CTA: "Precisa de acompanhamento presencial? Encontre um fisioterapeuta na sua regiao"
- Botao leva para `/professionals`

### 3.5 Dashboard do Profissional

No Dashboard, se o usuario logado tem registro em `professionals`:

- Secao extra mostrando indicacoes recebidas (tabela `professional_referrals`)
- Status de cada indicacao

---

## Resumo de Arquivos


| Arquivo                                         | Acao                                               |
| ----------------------------------------------- | -------------------------------------------------- |
| `supabase/migrations/`                          | Tabelas `professionals` e `professional_referrals` |
| `src/components/ComparisonSection.tsx`          | Novas linhas na tabela                             |
| `src/components/HighlightsSection.tsx`          | Nova secao de destaques                            |
| `src/pages/Index.tsx`                           | Integrar HighlightsSection                         |
| `src/pages/ProfessionalRegister.tsx`            | Formulario de cadastro                             |
| `src/pages/ProfessionalSearch.tsx`              | Busca e listagem                                   |
| `src/components/assessment/DiagnosisResult.tsx` | CTA para buscar profissional                       |
| `src/components/assessment/TreatmentPlan.tsx`   | CTA para buscar profissional                       |
| `src/pages/Dashboard.tsx`                       | Secao de indicacoes (para profissionais)           |
| `src/App.tsx`                                   | Novas rotas                                        |
| `src/contexts/LanguageContext.tsx`              | Traducoes PT/EN                                    |


## Ordem de Implementacao

1. Migracoes do banco (professionals + professional_referrals)
2. Tabela comparativa atualizada + secao de destaques
3. Paginas do marketplace (cadastro + busca)
4. CTAs no fluxo de avaliacao
5. Dashboard do profissional
6. Traducoes completas