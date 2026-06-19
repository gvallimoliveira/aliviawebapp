# Bottom Tab Bar PRO (mobile)

Objetivo: dar ao profissional PRO um acesso rápido, com o polegar, às 4 ações do dia a dia, sem precisar rolar até as abas no topo.

## Onde aparece

- Apenas no `/dashboard`.
- Apenas em **mobile** (`md:hidden`, breakpoint 768px).
- Apenas quando `activeContext === "professional"` ou modo academico ou`professional_demo` (PRO real ou demo). Não aparece em modo Clínica nem Paciente (esses já têm UX dedicada).
- Sticky no rodapé, respeitando safe-area do iOS (`env(safe-area-inset-bottom)`).
- z-index abaixo de Dialogs/Sheets (z-40) para que modais (Avaliação Manual, mensagens, etc.) cubram a barra naturalmente quando abertos.

Conteúdo do Dashboard ganha `pb-24 md:pb-0` quando a barra está visível, para não ficar coberto.

## Os 4 atalhos


| Ícone                                    | Label     | Ação                                                                                                                 |
| ---------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| `Users`                                  | Pacientes | `setActiveTab("professional")` e scroll para o topo da lista. Estado ativo quando `activeTab === "professional"`.    |
| `Stethoscope` (botão central, destacado) | Avaliar   | Abre o **Seletor de Paciente para Avaliação** (ver abaixo).                                                          |
| `CalendarDays`                           | Agenda    | `setActiveTab("agenda")`. Ativo quando `activeTab === "agenda"`.                                                     |
| `Brain`                                  | Agente    | `navigate("/agente")`. Só habilitado quando `hasAgentAccess` é true; caso contrário oculto (a grade vira 3 colunas). |


Visual: pílulas com ícone + label pequeno (text-[10px]), `bg-background/95 backdrop-blur` com borda superior sutil. O botão central "Avaliar" recebe um realce (círculo elevado em `bg-primary text-primary-foreground shadow-lg`, levemente acima da linha base) para sinalizar a ação principal.

## Seletor de Paciente para Avaliação (novo)

Sheet vindo de baixo (`Sheet` shadcn, side="bottom") com:

1. Campo de busca por nome/email.
2. **Botão fixo no topo:** "+ Adicionar novo paciente" — abre `AddPatientModal` existente. Ao concluir o cadastro, o paciente recém-criado é automaticamente selecionado e o `ManualAssessmentModal` abre na sequência (reaproveitando o callback `onCreateManualAssessment` já existente no `AddPatientModal`).
3. Lista de pacientes do profissional (query direta em `patients` com `professional_id = professional.id` e, se houver clínica ativa, `clinic_id = activeClinic.clinic_id`), ordenada por `updated_at desc`. Cada item mostra nome, idade/queixa principal se disponível, e abre o `ManualAssessmentModal` ao tocar.
4. Estado vazio com CTA para adicionar o primeiro paciente.

Ao confirmar a seleção, abre `ManualAssessmentModal` com `professionalId`, `clinicId`, `patientName`, `patientEmail` — exatamente o mesmo contrato já usado em `PatientListView`. Ao concluir, dispara `window.dispatchEvent(new CustomEvent("reload-pro-patients"))` para a listagem refletir o novo registro (padrão já adotado no projeto).

## Detalhes técnicos

Arquivos novos:

- `src/components/dashboard/ProBottomTabBar.tsx` — a barra em si.
- `src/components/dashboard/AssessPatientPicker.tsx` — Sheet de seleção/criação de paciente.

Edição em `src/pages/Dashboard.tsx`:

- Renderizar `<ProBottomTabBar>` dentro do bloco PRO (logo após o `</Tabs>`), recebendo `activeTab`, `onChangeTab`, `hasAgentAccess`, `professional`, `activeClinicId`, `isProDemo`.
- Adicionar classe `pb-24 md:pb-0` no container do conteúdo PRO quando a barra estiver visível.
- Em modo demo (`isProDemo`), os 4 atalhos continuam funcionais mas o "Avaliar" abre a versão demo do `ManualAssessmentModal` (`demoMode={true}`) e o picker lista os pacientes mock já em `mockPatientData`/contexto demo (fallback: se não houver `professional.id` real, picker mostra apenas "+ Adicionar novo paciente" e segue o fluxo demo).

Estado ativo da barra: derivado de `activeTab` (Pacientes / Agenda) e da rota atual (`/agente` → Agente ativo).

Acessibilidade: cada botão com `aria-label`, `role="tab"`, foco visível, área de toque ≥ 44px. Bar fixa não interfere com o `GlobalMobileMenu` (que já está oculto em `/dashboard`).

i18n: novas chaves `dashboard.bottombar.patients|assess|agenda|agent` e `dashboard.assess_picker.title|search|add_new|empty` em pt/en/es.

## Fora de escopo

- Não altera as abas do topo (continuam funcionando em desktop e mobile).
- Não muda o fluxo interno do `ManualAssessmentModal` nem do `AddPatientModal`.
- Não toca em modo Paciente, Clínica Owner ou Secretária.