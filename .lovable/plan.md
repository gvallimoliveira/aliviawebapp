

## Plano: Implementar 4 Novos Questionarios (QuickDASH, NDI, HIT-6, LEFS-8)

### Resumo

Adicionar 4 questionarios validados ao `questionnaireData.ts`, cobrindo todas as regioes restantes do mapa de dor. A exibicao na AssessmentView ja esta implementada. Sobre o LEFS: usaremos a versao **LEFS-8** (8 itens), uma short-form validada por Mehta et al. (2016) que mantem >95% da capacidade discriminativa do LEFS-20.

### Questionarios a implementar

| ID | Nome | Itens | Regioes cobertas (IDs do painMap) | Scoring |
|---|---|---|---|---|
| `quickdash` | QuickDASH | 11 | right/left_elbow, right/left_forearm, right/left_hand, elbow_left/right, forearm_left/right, hand_left/right, arm_left/right (back variants tambem) | higher_worse (0-100%) |
| `ndi` | NDI | 10 | cervical, cervical_front, cervical_left, cervical_right, head, head_back, head_left, head_right | higher_worse, formato identico ao ODI |
| `hit6` | HIT-6 | 6 | head, head_back, head_left, head_right | higher_worse (36-78 raw → normalizado %) |
| `lefs8` | LEFS-8 | 8 | right/left_thigh_ant, right/left_thigh_post, thigh_left/right, right/left_calf, right/left_shin, shin_left/right | higher_better (0-32 → %) |

### Detalhes por questionario

**1. QuickDASH (11 itens)**
- Subescalas: `daily_activities` (6 itens), `symptoms` (3 itens), `social_impact` (2 itens)
- Opcoes: Likert 1-5 (sem dificuldade → incapaz)
- Score: ((soma/n) - 1) * 25 = 0-100%
- Referencia: Beaton DE, et al. J Bone Joint Surg Am. 2005;87(5):1038-46

**2. NDI (10 itens)**
- Subescalas identicas ao ODI: pain_intensity, personal_care, lifting, reading, headache, concentration, work, driving, sleeping, recreation
- Opcoes: 6 niveis (0-5) como ODI
- Score: soma / (n*5) * 100
- Referencia: Vernon H, Mior S. J Manipulative Physiol Ther. 1991;14(7):409-15

**3. HIT-6 (6 itens)**
- Subescala unica: `impact`
- Opcoes: Never(6), Rarely(8), Sometimes(10), Very Often(11), Always(13)
- Score raw: 36-78. Normalizado: ((raw-36)/42)*100
- Referencia: Kosinski M, et al. Qual Life Res. 2003;12(8):963-74

**4. LEFS-8 (8 itens, short-form validada)**
- Itens selecionados com base na analise de Mehta et al.: atividades funcionais mais discriminativas do membro inferior (agachar, correr, caminhar quarteiroes, subir escadas, ficar em pe 1h, entrar/sair do carro, subir/descer calcada, atividades habituais)
- Opcoes: Likert 0-4 (extrema dificuldade → nenhuma dificuldade)
- Score: (soma / 32) * 100 → higher_better
- Referencia: Mehta SP, et al. Phys Ther. 2016;96(7):1014-24

### Arquivo editado

| Arquivo | Mudanca |
|---|---|
| `src/data/questionnaireData.ts` | Adicionar 4 arrays de perguntas + 4 definicoes no array `questionnaires` + atualizar `calculateQuestionnaireScore` para tratar scoring do QuickDASH e HIT-6 |

### Scoring no `calculateQuestionnaireScore`

Adicionar tratamento para:
- `quickdash`: ((soma/n_respondidos) - 1) * 25
- `ndi`: identico ao ODI (soma / (n*5) * 100)
- `hit6`: ((soma - 36) / 42) * 100
- `lefs8`: tratado como KOOS/HOOS (higher_better, Likert 0-4) — ja coberto pelo else generico, mas invertido: (soma / (n*4)) * 100

### Mapeamento de regioes

Todas as variantes de cada regiao no painMapData serao incluidas no `regionMapping`:
- **Cotovelo/Mao**: `right_elbow`, `left_elbow`, `right_elbow_back`, `left_elbow_back`, `elbow_left`, `elbow_right`, `right_forearm`, `left_forearm`, `right_forearm_back`, `left_forearm_back`, `forearm_left`, `forearm_right`, `right_hand`, `left_hand`, `right_hand_back`, `left_hand_back`, `hand_left`, `hand_right`, `right_arm`, `left_arm`, `right_arm_back`, `left_arm_back`, `arm_left`, `arm_right`
- **Cervical/Cabeca**: `cervical`, `cervical_front`, `cervical_left`, `cervical_right`, `head`, `head_back`, `head_left`, `head_right`
- **HIT-6**: apenas `head`, `head_back`, `head_left`, `head_right`
- **LEFS-8**: `right_thigh_ant`, `left_thigh_ant`, `right_thigh_post`, `left_thigh_post`, `thigh_left`, `thigh_right`, `right_calf`, `left_calf`, `right_shin`, `left_shin`, `shin_left`, `shin_right`

