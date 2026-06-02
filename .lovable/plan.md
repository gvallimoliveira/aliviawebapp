## Diagnóstico

### 1) Anamnese de voz travada em "processando"
- Voice note `96dfee83…` da Pâmela: 465s (~7.75 min), `status=processing` sem `error`, sem `transcript`.
- **Edge function `transcribe-anamnesis` não tem nenhum log de invocação** nesse horário (outras funções têm logs normais). Ou seja, a chamada nunca chegou no servidor.
- Causa provável: gravação > 4 MB foi enviada para o bucket `voice-notes-tmp`, mas o `supabase.functions.invoke("transcribe-anamnesis", ...)` falhou no cliente (timeout/rede/erro). O código atual chama `.then(({error}) => console.error(...))` "fire-and-forget" — se der erro, o usuário nunca sabe e o registro fica preso em `processing` para sempre. Também não há nenhum watchdog/retry.
- Não houve perda de áudio do lado do servidor — simplesmente o job não foi disparado / não foi acompanhado.

### 2) Comparação de dor por região repete a mesma nota
- `ManualAssessmentModal` tem 1 único slider de dor (0–10) + checkbox múltipla de regiões → salva `pain_score` (escalar) e `pain_regions` (array). Não salva `painScoresPerRegion`.
- `RegionPainComparison.tsx` já está preparado para usar `anamnesis_data.painScoresPerRegion`, mas como ele não existe, cai no fallback `present ? a.pain_score : null` → mesma nota para todas as regiões. **Bug está na entrada de dados, não na comparação.**

---

## Plano

### Fix 1 — Avaliação manual: nota de dor por região

**`src/components/dashboard/ManualAssessmentModal.tsx`**
- Substituir o slider único de dor por:
  - Slider geral mantido como "Intensidade média/predominante" (compatibilidade + valor agregado salvo em `pain_score`).
  - Após o usuário marcar regiões em `painRegions`, renderizar uma lista com **1 slider 0–10 por região marcada** (label = `regionLabelMap[id]`).
  - Estado novo: `painScoresPerRegion: Record<string, number>` inicializado com o valor do slider geral; ao adicionar/remover região, sincroniza o mapa.
- Persistência:
  - `pain_score` = `Math.max(...Object.values(painScoresPerRegion))` (ou média — usar **máximo** porque é mais clínico e mantém timelines/badges existentes coerentes com a queixa pior).
  - `anamnesis_data.painScoresPerRegion = { [regionId]: score }`.
- Aplicar nas duas branches de save (rascunho + finalização) e no caminho do mock/demo case.

**`src/components/dashboard/RegionPainComparison.tsx`**
- Já funciona; nenhuma mudança lógica necessária. Apenas confirmar que o `scoreFor` continua usando `painScoresPerRegion` (sem média de bilaterais erradas — manter a média atual quando lado D./E. caem na mesma zona).

**`PatientDetailView.tsx` / `AssessmentTimeline` / PDFs**
- Continuam usando `pain_score` agregado → sem regressão. (Sem mudanças.)

### Fix 2 — Gravação de anamnese travada em "processando"

**Imediato (este registro)**
- Marcar `96dfee83…` como `failed` com mensagem explicando que o áudio não foi processado e orientar a refazer (via migração `UPDATE … WHERE id=…`).

**Prevenção (cliente)** — `src/contexts/VoiceRecorderContext.tsx`:
- Trocar `.then(...)` fire-and-forget por `await` dentro do `try/catch` e, em caso de erro do invoke:
  - `UPDATE assessment_voice_notes SET status='failed', error=<msg>` no próprio cliente.
  - Toast destrutivo claro ("Falha ao processar áudio. Tente novamente.").
- Adicionar limite duro de duração para upload: se `recordedSeconds > 15*60` (≈15 min), avisar que áudios longos podem falhar e pedir confirmação (Gemini tem limites práticos por chamada).

**Watchdog (servidor)** — nova migração + função:
- Função SQL (ou ajuste no `cleanup-pending-assessments` cron existente) que marca como `failed` qualquer `assessment_voice_notes` com `status='processing'` há mais de 10 minutos. Mensagem: "Tempo de processamento excedido — refaça a gravação."

**UI do prontuário** — `VoiceNoteCard.tsx` (verificar):
- Garantir que estados `failed` mostram CTA "Tentar novamente" ou ao menos a mensagem de erro, em vez de spinner eterno.

### Fora de escopo
- Não vamos mexer no edge function `transcribe-anamnesis` em si — ele não foi nem chamado. Se persistir após o fix do cliente, investigamos limites do Gemini para áudios longos numa próxima rodada.
