---
name: Assisted Differential Diagnosis
description: Diagnóstico diferencial assistido — gatilho por confiança baixa/moderada, conteúdo, adoção como hipótese final e bloco opcional no PDF.
type: feature
---

- Gate: só oferece diferenciais quando a confiança da hipótese da IA é `low`/`moderate` (`shouldOfferDifferential` em `src/lib/differentialDiagnosis.ts`) e não há hipótese final já definida. Nunca em confiança alta.
- Geração é **sempre manual** (clique), nunca automática — não intrusivo.
- Backend: `supabase/functions/generate-differential-diagnosis` (cache 7d, versão do prompt `dd-v1`). Retorna 2-4 itens com `hypothesis`, `plausibility`, `competesBecause`, `arguesAgainst`, `discriminators[]`, `whyItMatters`, `referralFlag`.
- UI: `DifferentialDiagnosisPanel` dentro do card de Hipótese Diagnóstica (`PatientDetailView`) e na etapa de diagnóstico do `ManualAssessmentModal` ("Refinar antes de fechar").
- Ações: adotar item como hipótese final (usa fluxo `final_hypothesis`) e anexar discriminadores às observações da sessão.
- PDF: bloco "Diagnósticos Diferenciais Considerados" só sai quando o profissional marca `includeInPdf`; renderizado após o Raciocínio Clínico com disclaimer de decisão do fisioterapeuta.
- Red flags presentes ⇒ item marcado com `referralFlag` (triagem médica).
