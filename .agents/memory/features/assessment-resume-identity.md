---
name: Retomada de avaliação por identidade
description: Regras de retomada automática de avaliação/reavaliação — link genérico exige identidade (e-mail/nome), nunca dispositivo.
type: feature
---

Backup de progresso (TTL 24h) tem dois regimes:

1. **Link personalizado (`?patient=token`) ou reavaliação** — escopo único por paciente
   (`pro|clinic:<id>:<token>:<steps>`). Retomada automática já na tela de boas-vindas,
   com sincronização em nuvem (`assessment_progress`) e conciliação cross-device.

2. **Link genérico/público (`anon`)** — NUNCA retoma por dispositivo. O escopo recebe um
   sufixo `#<hash da identidade>` derivado do e-mail (ou nome, se não houver e-mail),
   e a retomada só é oferecida **depois** que o paciente preenche a identificação e
   somente se a identidade bater com o rascunho. Backups de outras identidades do mesmo
   link são apagados nesse momento. Nada de nuvem nesse caso (sem token não há segredo
   que prove identidade — e-mail em chave pública permitiria adivinhação).

UI: a tela de retomada mostra de quem é o rascunho e oferece "Não sou eu — começar do zero"
quando a retomada veio de link genérico.

Arquivos: `src/lib/assessmentAutoResume.ts` (`identityOf`, `identityScopeKey`,
`matchesIdentity`, `clearOtherIdentityProgress`), `ProfessionalAssessment.tsx`,
`ClinicAssessment.tsx`, `ResumeSummary.tsx`.
