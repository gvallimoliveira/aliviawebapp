---
name: Multi-Condition Patient Dashboard
description: Painel pessoal agrupa avaliações por condição clínica (região + episódio); diário de dor, evolução e histórico são por condição.
type: feature
---

Um paciente pode ter várias condições em paralelo (ex.: lombar, ombro D., cotovelo E.). O painel pessoal NÃO mistura mais os dados.

## Agrupamento (`src/lib/painConditions.ts`)
- Cluster por região corporal + lateralidade (lumbar, shoulder R/L, elbow, knee, ankle/foot, hip, cervical, thoracic, wrist/hand, general).
- Novo episódio quando: intervalo > 180 dias entre avaliações do mesmo cluster E hipótese pouco similar (`hypothesisSimilarity` por tokens). Label ganha "2º episódio".
- Condição é `isActive` se a última avaliação tem < 120 dias.
- Sem `pain_regions` → condição "Geral".

## Foco
`usePainConditions` persiste a condição em foco em `localStorage` (`alivia_focus_condition`). Todos os widgets (EvolutionSummary, AssessmentComparison, AssessmentHistory, AdaptiveProgressionCard) recebem só as avaliações da condição em foco.

## Diário de dor
`pain_diary_entries.condition_key` (nullable = legado/Geral). Índice único `(user_id, logged_at, coalesce(condition_key,''))` permite 1 registro por condição por dia. Streak/semana contam o dia se QUALQUER condição foi registrada. A UI permite registrar rapidamente as outras condições no mesmo dia ("Registrar também").

## HEP por condição
`get_my_active_exercise_programs()` retorna `assessment_id`. O `ExerciseChecklist` recebe os IDs das avaliações da condição em foco e mostra só os programas vinculados a elas (programas sem avaliação vinculada continuam visíveis; os de outras condições viram contador "ocultos"). Filtro só ativa com 2+ condições. Progresso/parabéns contam apenas os exercícios visíveis.
