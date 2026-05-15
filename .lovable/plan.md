# Gravador de Voz IA na Avaliação Manual

## Visão geral

Adicionar um **botão flutuante persistente** de gravação durante o fluxo de avaliação manual, mas que nao impeça a visualização ou cliques na pagina durante o processo da avaliação manual. O botão tem que ficar posicionado estrategicamente em um canto "morto" desse fluxo. Ao parar, o áudio é enviado em background para uma edge function que usa **Gemini 2.5 Flash** (multimodal, aceita áudio nativo) para transcrever **e** gerar um resumo clínico estruturado em uma única chamada. O áudio é descartado; apenas transcrição + resumo ficam salvos e aparecem no prontuário do paciente.

O profissional **não precisa esperar** — pode finalizar e salvar a avaliação normalmente. A transcrição aparece depois no card do paciente.

## Componentes novos

### 1. Tabela `assessment_voice_notes`

- `assessment_id` (FK assessments) ou `patient_id` (caso avaliação ainda não exista)
- `professional_id`, `clinic_id`
- `status`: `recording` | `processing` | `ready` | `failed`
- `transcript` (text)
- `summary` (jsonb) — estrutura: `{ chiefComplaint, painHistory, aggravatingFactors, relievingFactors, previousTreatments, redFlagsHints, observations }`
- `duration_seconds`, `language`, `error`
- RLS: profissional dono ou membro da clínica podem ler/escrever

### 2. Edge function `transcribe-anamnesis`

- Recebe `{ audio_base64, mime_type, voice_note_id, language }`
- Chama Lovable AI Gateway com `google/gemini-2.5-flash` enviando áudio inline + system prompt clínico pedindo JSON estruturado (transcrição literal + resumo D.I.F.I)
- Aplica os 4 layers de extração de JSON (regra do projeto)
- Atualiza `assessment_voice_notes` com `status='ready'`, transcript e summary

### 3. Componente `VoiceRecorderFAB`

- Botão flutuante (canto inferior direito), só visível em `ManualAssessmentModal` e `Assessment` (quando profissional)
- Estados: idle → recording (pulse vermelho + timer) → paused → uploading → done
- Usa `MediaRecorder` (webm/opus), pede permissão de mic
- Mobile-friendly (440px viewport considerado)
- Avisa ao iniciar: "Áudio será descartado após processamento. Apenas transcrição + resumo serão salvos."
- Após stop: cria registro `recording`, faz upload em background via `supabase.functions.invoke`, mostra toast "Processando em segundo plano"

### 4. Card `VoiceNoteCard` no prontuário

- Aparece em `PatientDetailView` (e talvez `AssessmentView` para o profissional)
- Mostra status (chip "Processando..." com spinner / "Pronto")
- Quando ready: accordion com **Resumo Estruturado** (default aberto) + **Transcrição completa** (collapse)
- Botão "Copiar resumo" / "Copiar transcrição"
- Realtime: usa `postgres_changes` na linha para auto-atualizar quando ficar `ready`

## Fluxo

```text
Profissional inicia consulta
  └─ clica FAB rec → grava em background
Profissional preenche anamnese normalmente
  └─ pode pausar/retomar gravação
Termina consulta → clica stop
  ├─ áudio sobe → status=processing
  └─ profissional finaliza/salva avaliação manual
Edge function processa (Gemini)
  └─ status=ready → card no prontuário se atualiza via realtime
```

## Detalhes técnicos

- **Modelo**: `google/gemini-2.5-flash` (suporta áudio nativo, baixo custo, JSON output via Output API).
- **Limites**: Gemini Flash aceita até ~9.5h de áudio; vamos limitar UI a **30 min** por gravação.
- **Tamanho**: webm/opus ~500KB/min → 30 min ≈ 15MB. Upload via JSON base64 (edge function aceita até 6MB body) — se ficar >5MB, fazemos upload temporário pra um bucket privado `voice-notes-tmp`, edge function lê e deleta.
- **Privacidade**: áudio nunca é persistido; bucket tmp tem auto-cleanup em 1h.
- **Idiomas**: detecta do `i18n` atual (pt/en/es).
- **Erros**: 429/402 do gateway → mensagem clara no card; profissional pode "Tentar novamente".

## Arquivos a criar/editar

- **Migration**: tabela `assessment_voice_notes` + RLS + bucket `voice-notes-tmp` privado
- **Nova edge function**: `supabase/functions/transcribe-anamnesis/index.ts`
- **Novo componente**: `src/components/dashboard/VoiceRecorderFAB.tsx`
- **Novo componente**: `src/components/dashboard/VoiceNoteCard.tsx`
- **Editar**: `src/components/dashboard/ManualAssessmentModal.tsx` (montar FAB)
- **Editar**: `src/components/dashboard/patient-evolution/PatientDetailView.tsx` (mostrar card)
- **Editar**: `src/locales/pt.json`, `en.json`, `es.json` (strings)
- **Editar**: `src/pages/Support.tsx` + `ClinicSupport.tsx` (regra de memória — documentar feature)

## Pontos em aberto pra você confirmar

1. **Onde aparece o FAB?** Só dentro do modal de avaliação manual, ou também na página de avaliação completa (`/assessment/...` quando profissional está atendendo)?
2. **Quem pode usar?** Apenas PRO + Clínica owner/therapist, ou também secretária?
3. **Limite de duração**: 30 min ok?
4. **Card no prontuário**: aparece pra paciente também ver, ou só profissional/clínica? (sugiro só profissional — info clínica interna).