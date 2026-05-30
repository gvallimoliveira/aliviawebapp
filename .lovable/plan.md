## Objetivo

Tornar a **Avaliação Manual** visível mas não-utilizável no modo demonstração (PRO e Clínica), com uma experiência divertida: ao **clicar em qualquer campo**, ele é preenchido automaticamente com dados de um caso simulado (como se o fisioterapeuta tivesse digitado/selecionado). Inclui também aviso e simulação do **gravador de voz + transcrição**, e adiciona transcrições mock aos prontuários demo.

## Mudanças

### 1. `ManualAssessmentModal` aceita modo demo
Arquivo: `src/components/dashboard/ManualAssessmentModal.tsx`

- Nova prop `demoMode?: boolean` (default `false`).
- Quando `demoMode`:
  - Banner amarelo no topo do dialog: *"Modo demonstração — preenchimento automático com caso simulado. Avance pelas etapas para conhecer o fluxo. Assine PRO para usar com pacientes reais."*
  - Inputs/Textareas/Selects/Sliders ficam **`readOnly` / `disabled`** para teclado.
  - Cada campo recebe um wrapper `onClick` (no `<label>` ou container) que dispara `autofillField(fieldKey)` — preenche aquele campo com o valor do caso mock (se já preenchido, alterna para "limpo" para reproduzir múltiplos cliques de forma agradável).
  - Mapa de dor: clique em qualquer região do mapa **adiciona regiões pré-definidas do caso** (ex.: `lower_back`, `gluteal_right`) em ordem.
  - Questionários (`QuestionnaireStep`): nova prop `autofillCase` que, ao clicar em qualquer opção, seleciona a resposta do caso mock para aquela questão (e não a opção clicada).
  - Botão **Salvar / Gerar diagnóstico** desativado com tooltip "Disponível no plano PRO" → abre upsell (já existe padrão em `ProfessionalAssessmentDemo`).
  - `useAutosaveDraft` desabilitado.
  - `useVoiceRecorderSession` não conecta — substituído por mock visual (item 3).

### 2. Caso simulado
Arquivo novo: `src/data/mockManualAssessmentCase.ts`

Exporta um objeto único `MOCK_MANUAL_CASE` com valores para cada campo: queixa principal, história, duração, agravantes, aliviantes, medicações, comorbidades, ocupação, score/tipo de dor, regiões, red flags (vazio), respostas dos questionários (Roland-Morris ou ODI), testes funcionais sugeridos com resultados. Cenário escolhido: **lombalgia mecânica crônica em escritório** (alinhado com KB existente).

### 3. Aviso + simulação do gravador de voz
- No `ManualAssessmentModal` em `demoMode`, substituir o FAB real por um **botão mock** "Gravar voz (simulação)" na barra do modal. Ao clicar:
  - Toast: *"Em PRO real, gravamos sua voz e a IA transcreve direto no prontuário."*
  - Anima 3s um waveform fake e mostra um card de "transcrição gerada" estática, vinda do caso mock.
- Banner explicativo curto perto do botão.

### 4. Transcrições mock nos prontuários demo
- Em `src/data/mockProDemoExtras.ts` e `src/data/mockClinicData.ts`: adicionar campo `voiceNotes: Array<{ id, created_at, transcription, summary, duration_seconds }>` em 2–3 pacientes simulados.
- `VoiceNoteCard` (`src/components/dashboard/VoiceNoteCard.tsx`): aceitar prop opcional `mockNotes` que, quando presente, renderiza esses dados sem consultar Supabase.
- `PatientDetailView` repassa `mockNotes` quando o paciente vier do mock (já tem flag de paciente simulado disponível via `isDemo`/`readOnly`).

### 5. Propagação `demoMode` até o modal
- `PatientEvolutionDashboard` já recebe `isDemo`. Repassar para `PatientListView` e `PatientDetailView`, e ambos repassarem `demoMode={isDemo}` ao `ManualAssessmentModal`.
- `ProfessionalDemo.tsx` e `ClinicDemo.tsx` já marcam `isDemoMode` — nenhuma mudança ali além de garantir que `isDemo` chegue ao `PatientEvolutionDashboard`.

## Detalhes técnicos

- **Read-only sem quebrar layout**: aplicar `readOnly` em `<Input>`/`<Textarea>` e `pointer-events-none` + `tabIndex={-1}` apenas nos controles internos, mas **manter `onClick` no container** para disparar o autofill. Em `<Select>`/`<Slider>`/`<Checkbox>` usar `disabled` e interceptar com um overlay clicável que chama o autofill.
- **Autofill incremental**: o helper `autofillField(key)` lê de `MOCK_MANUAL_CASE[key]` e chama o `setState` correspondente; um pequeno mapa `Record<string, () => void>` no início do componente evita um `switch` gigante.
- **Sem efeitos colaterais**: nenhuma chamada a `supabase.*` quando `demoMode`. Guard no início de `handleSave`, `generateDiagnosis`, `generateTreatment`, `generateClinicalImpression`, `loadDraft`, etc.
- **i18n**: textos novos em PT/EN seguindo o padrão `tl()` já usado no arquivo.

## Fora do escopo
- Não altera lógica de assinatura, RLS, ou fluxo real do `ManualAssessmentModal` para usuários PRO/clínica reais.
- Não cria endpoint/edge function novo.