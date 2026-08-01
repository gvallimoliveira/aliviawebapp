---
name: Continuidade básica → premium
description: Red flags reaproveitadas e hipótese diagnóstica contínua no upgrade da autoavaliação básica para a premium.
type: feature
---

No handoff `alivia-basic-upgrade-data` (DiagnosisResult → Assessment) viajam, além de anamnese/regiões/dor/nome/e-mail:

- `redFlagPayload`: payload probatório da triagem feita na básica. No premium, se for recente (< 6h), `outcome === "passed"` e sem positivo, a etapa de red flags **não é exibida** — o payload é hidratado, marcado com `carried_from_basic: true` e gravado em `assessments.red_flags`. Qualquer red flag positiva mantém o bloqueio/ressalva normal (nunca pular).
- `basicDiagnosis` (hypothesis/confidence/summary): enviado como `previousBasicDiagnosis` para `generate-diagnosis`. A IA deve **manter a mesma linha diagnóstica** se os dados premium não a contradisserem; ao mudar, preenche `hypothesisChange` { previousHypothesis, currentHypothesis, reason } e o `DiagnosisResult` mostra o bloco "Sua hipótese foi refinada".

O mesmo vale no caminho assíncrono (boleto), lendo `assessments.pending_upgrade_data`.
