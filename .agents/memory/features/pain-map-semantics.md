---
name: Pain Map Semantics
description: Cervical = posterior; Pescoço = anterior. Refinamento anatômico por região no mapa de dor (manual + anamnese).
type: feature
---

# Semântica do mapa de dor

## Cervical vs. Pescoço (regra anatômica)
- **"Cervical"** = região posterior/postero-lateral (nuca, trapézio superior). Id `cervical` (vista posterior) — usado por padrão quando o usuário/profissional fala "dor cervical".
- **"Pescoço (anterior)"** = região anterior/antero-lateral. Id `cervical_front` (vista frontal) — usado para queixas como ECM, faringe, antero-lateral.
- Nunca rotular `cervical_front` como apenas "Cervical". A lista simplificada do `ManualAssessmentModal` mantém **ambos** os ids; o id da vista posterior NÃO pode ser excluído de `SIMPLIFIED_EXCLUDED_IDS`.
- `PainMapView` escolhe a vista pelos ids selecionados → marcar `cervical` renderiza automaticamente a vista posterior.

## Refinamento anatômico por região (ManualAssessmentModal → `AXES_BY_GROUP`)
Cada região oferece apenas as opções clinicamente significativas:
- **Cervical posterior**: central, postero-lateral D/E.
- **Pescoço anterior**: central, antero-lateral D/E.
- **Lombar**: central (processos espinhosos), unilateral D, unilateral E, bilateral em faixa.
- **Torácica**: central, paravertebral D/E, bilateral.
- **Cabeça**: frontal, temporal D/E, occipital, difusa.
- **Tórax/Abdômen**: central, lado D, lado E.
- **Ombro**: anterior, lateral, posterior, superior (acrômio).
- **Cotovelo**: medial (epitróclea), lateral (epicôndilo), anterior, posterior (olécrano).
- **Quadril**: anterior (virilha), lateral (trocânter), posterior (glúteo), medial.
- **Joelho**: anterior (patelar), posterior (poplítea), medial, lateral.
- **Tornozelo**: anterior, posterior (Aquiles), medial, lateral.
- **Pé**: plantar, dorsal, medial, lateral, calcâneo, antepé.
- **Mão**: palmar, dorsal, radial, ulnar.
- **Outros segmentos de membro** (braço, antebraço, coxa, perna/panturrilha): anterior, posterior, medial, lateral, proximal, distal.

## AnamnesisForm (fluxo do paciente)
`getSubAreasForRegion` segue a mesma tabela. Inclui `elbow` como tipo detectável (regiões `right_elbow/left_elbow/...` + queixa `anamnesis.complaint.elbow_pain`).
