## Problema

Na avaliação manual, ao marcar "Cervical" o sistema seleciona `cervical_front` (vista anterior), porque na lista simplificada (`SIMPLIFIED_EXCLUDED_IDS` em `ManualAssessmentModal.tsx`) o id da vista posterior (`cervical`) está excluído e sobra apenas `cervical_front` rotulado como "Cervical". Anatomicamente, **dor cervical = posterior/postero-lateral**; "pescoço" = anterior/antero-lateral.

Além disso, o refinamento anatômico por região é genérico demais: regiões axiais só oferecem D/E/central e os membros oferecem todos os eixos juntos, sem refletir o que realmente faz sentido clinicamente em cada articulação.

## Solução

### 1. Cervical no mapa de dor (manual + visualização)
- Em `painMapData.ts`:
  - Renomear o rótulo de `cervical_front` para **"Pescoço (anterior)" / "Neck (anterior)"** (id mantido por compatibilidade).
  - Manter `cervical` (back view) com rótulo **"Cervical (posterior)" / "Cervical (posterior)"**.
- Em `ManualAssessmentModal.tsx → SIMPLIFIED_EXCLUDED_IDS`:
  - Remover `"cervical"` (passa a aparecer na lista, como cervical posterior — opção padrão para "dor cervical").
  - Manter `cervical_front` na lista (agora claramente rotulado como pescoço anterior).
- Como `PainMapView.tsx` já escolhe a vista com base nos ids selecionados, marcar `cervical` automaticamente renderiza a vista posterior. Nada a mudar lá.

### 2. Refinamento anatômico específico por região (manual)
Substituir o par único axial/apendicular por uma tabela por região em `getRefinementAxes`:

| Região (id contém) | Opções de refinamento |
|---|---|
| `cervical` (post.) | Central, Postero-lateral D, Postero-lateral E |
| `cervical_front` / pescoço anterior | Central, Antero-lateral D, Antero-lateral E |
| `lower_back` / `lumbar` | Central (processos espinhosos), Unilateral D, Unilateral E, Bilateral (em faixa) |
| `thoracic` | Central, Paravertebral D, Paravertebral E, Bilateral |
| `head` | Frontal, Temporal D, Temporal E, Occipital, Difusa |
| `chest` / `abdomen` | Central, Lado D, Lado E |
| `shoulder` | Anterior, Lateral, Posterior, Superior |
| `elbow` | Medial (epitróclea), Lateral (epicôndilo), Anterior, Posterior (olécrano) |
| `hip` | Anterior (virilha), Lateral (trocânter), Posterior (glúteo), Medial |
| `knee` | Anterior (patelar), Posterior (poplítea), Medial, Lateral |
| `ankle` | Anterior, Posterior (Aquiles), Medial, Lateral |
| `foot` | Plantar, Dorsal, Medial, Lateral, Calcâneo, Antepé |
| `hand` | Palmar, Dorsal, Radial, Ulnar |
| outros membros (braço, antebraço, coxa, perna/panturrilha) | Anterior, Posterior, Medial, Lateral, Proximal, Distal |

Etiqueta "Axial / Apendicular" no card vira o nome do grupo anatômico real (ex.: "Coluna cervical", "Joelho"). Multi-seleção mantida.

### 3. Anamnesis Form (fluxo do paciente)
Em `getSubAreasForRegion` de `AnamnesisForm.tsx`, expandir as opções para refletir a mesma granularidade:
- `cervical`: Posterior, Postero-lateral, (remover antero-lateral daqui — pertence a pescoço, caso futuramente seja exposto).
- `knee`: Anterior, Posterior, Medial, Lateral (já tem — manter).
- `ankle`: Anterior, Posterior, Medial, Lateral.
- `hip`: Anterior, Posterior, Lateral, Medial.
- `shoulder`: Anterior, Lateral, Posterior, Superior (já tem — manter).
- Adicionar `elbow`: Medial, Lateral, Anterior, Posterior — e expor quando a queixa for cotovelo.

Strings novas (pt/en/es) adicionadas em `locales/*.json` sob `anamnesis.*.{...}_desc`.

### 4. Atualizar memória do projeto
Adicionar `mem://features/pain-map-semantics` com a regra: "Cervical = posterior; Pescoço = anterior. Refinamento anatômico segue tabela por região (lombar central/uni/bilateral, joelho/tornozelo/quadril nos 4 quadrantes, cotovelo medial/lateral/ant/post)."

## Arquivos afetados
- `src/components/assessment/painMapData.ts` (relabels)
- `src/components/dashboard/ManualAssessmentModal.tsx` (lista simplificada + `getRefinementAxes` por região)
- `src/components/assessment/AnamnesisForm.tsx` (`getSubAreasForRegion`)
- `src/locales/{pt,en,es}.json` (novas chaves de descrição)
- `.agents/memory/features/pain-map-semantics.md` + atualização do `mem://index.md`

## Fora do escopo
Não tocar nas SVG paths nem mudar o renderer (`PainMapView.tsx`), nem na lógica de IA de diagnóstico — apenas semântica de seleção/rótulos e granularidade do refinamento.
