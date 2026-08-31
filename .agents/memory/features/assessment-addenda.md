---
name: Assessment Addenda
description: Informações adicionais em avaliação já concluída — adendo manual do profissional, link do paciente (/adendo/:token) e reinterpretação opcional da IA.
type: feature
---

- Tabela `assessment_addenda` (content, author_type profissional/paciente, token, status pending/submitted, considered_at).
- Prontuário: bloco "Informações adicionais" (`sec-adendos`, `AssessmentAddendaCard`) logo abaixo da impressão clínica. Mostra adendos, badge "não interpretado" e contagem de novos.
- Paciente: link exclusivo por avaliação `/adendo/:token`, servido pela edge function `assessment-addendum` (`load` / `submit`, service role + push ao profissional).
- Reinterpretação é **opt-in**: botão "Reinterpretar avaliação" chama `generate-diagnosis` com `additionalInfo` = anamnese + adendos, salva versão anterior em `diagnosis.previousVersions[]` e liga `needs_reimpression` (impressão clínica regenera). Sem clique, não gasta crédito.
- PDF de avaliação: seção "Informações Adicionais" (`PdfOptions.addenda`).
