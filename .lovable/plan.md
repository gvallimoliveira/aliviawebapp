# Ditar a evolução do paciente por voz

## O que muda para o profissional

Uma barra de gravação fica anexa ao campo de evolução (não é botão flutuante). Ao tocar em "Ditar", o texto vai aparecendo no campo frase a frase, enquanto ele fala. Ele pode pausar, parar e continuar depois; o texto fica exatamente como foi falado, sem reorganização automática.

Onde aparece:
- No formulário de evolução do prontuário (novo registro e edição).
- Dentro do "Histórico de evolução" (modal): cada registro passa a ter edição no próprio modal, com a mesma barra de gravação, sem precisar fechar e voltar ao prontuário.

Detalhes da barra:
- Seletor de destino: "Evolução" ou "Observação" — o texto ditado entra no campo escolhido, sempre no fim do que já estava escrito, sem apagar nada.
- Estado visível: ponto vermelho pulsando, cronômetro, botões pausar/parar e um "cancelar" que descarta o trecho em andamento.
- Indicação discreta de "ouvindo…" enquanto o trecho corrente é convertido.
- O áudio não é guardado: cada trecho é convertido em texto e descartado. Nada é salvo no banco até o profissional clicar em salvar a evolução.
- Se o microfone for negado ou a conversão falhar, a barra avisa no lugar (sem toast que empurra a página) e o que já foi transcrito permanece no campo.
- Em modo demonstração a barra não aparece.

## Como a transcrição fica rápida

A gravação é fatiada em trechos curtos de ~6 segundos, cortados de preferência numa pausa da fala. Cada trecho é enviado assim que fecha e o texto retornado é anexado ao campo — por isso o texto surge "sendo escrito" durante o ditado, em vez de só no final. Os trechos são enviados em ordem e o texto é anexado na ordem correta mesmo que uma resposta chegue fora de ordem.

## Detalhes técnicos

- Nova edge function `transcribe-session-note`: recebe `{ audio_base64, mime_type, language }`, chama `https://ai.gateway.lovable.dev/v1/audio/transcriptions` com `google/gemini-3.5-transcribe` e devolve `{ text }`. Sem escrita em banco, sem resumo — só transcrição. Requer JWT do profissional; mesmo tratamento de erro das outras funções (429/402 com mensagem clara) e `shadowLogAiUsage` com `function_name: "transcribe-session-note"`.
- Novo hook `src/hooks/useDictation.ts`: captura PCM via Web Audio (`AudioContext` + `ScriptProcessor`/`AudioWorklet`), acumula ~6 s, codifica WAV mono 16 kHz completo por segmento (evita o problema de fragmento sem cabeçalho do `MediaRecorder` com timeslice e o MP4 fragmentado do iOS Safari), descarta segmentos abaixo de um piso de bytes, envia via `supabase.functions.invoke` com fila ordenada, expõe `state`, `seconds`, `start/pause/resume/stop/cancel`, `error` e callback `onText(text)`.
- Novo componente `src/components/dashboard/DictationBar.tsx`: barra compacta (`rounded-xl`, tokens do design system), seletor de destino, cronômetro e ações; recebe `onAppend(target, text)`.
- `SessionNotesSection.tsx`: renderiza `DictationBar` acima do campo "Evolução da sessão"; o append usa `anchorScroll` para não pular a página e insere no fim do texto atual com espaço/pontuação simples.
- `SessionNotesHistoryModal.tsx` + `SessionNoteItem.tsx`: modo de edição inline no modal (textarea de evolução + observação + `DictationBar`), salvando pelo mesmo caminho já existente (`onSaveEdit` passado pelo `SessionNotesSection`, que faz o `update` em `session_notes` e refaz o `fetchNotes`). O botão "editar" do card do prontuário continua abrindo o formulário do card.
- i18n pt/en/es para os novos rótulos (ditar, pausar, parar, ouvindo, destino, erros).
- Atualizar `Support.tsx` e `ClinicSupport.tsx` (pt/en/es) com a nova função, conforme a regra de manutenção da página de suporte.
- Sem mudança de esquema, RLS ou grants; `assessment_voice_notes` e `transcribe-anamnesis` ficam intactos.

## Validação

- Teste unitário do encadeamento de trechos (ordem e append) em `src/test/`.
- Chamada real à nova função com um áudio falado sintetizado pelo endpoint de voz, conferindo que a frase volta transcrita.
- Verificação visual no preview (prontuário e histórico) em largura de celular e desktop.
