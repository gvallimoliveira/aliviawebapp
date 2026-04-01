

# Ajustar sub-áreas do ombro + Personalizar upsell no PDF básico

## 1. Corrigir sub-áreas do ombro na anamnese

**Arquivo:** `src/components/assessment/AnamnesisForm.tsx` (linhas 247-251)

Substituir as 3 opções atuais por 4 opções clinicamente corretas:

| Atual | Novo |
|-------|------|
| Anterior | Anterior (mantém) |
| Lateral | Lateral (mantém) |
| Superior / Medial ❌ | **Superior (acrômio / trapézio)** |
| — | **Posterior** (nova opção) |

Quando "posterior" for selecionado, exibir **pergunta condicional**: "Você sente dor próximo da escápula também?" (sim/não). Armazenar resposta em um novo campo `hasScapulaPain` no `AnamnesisData`.

**Arquivos de tradução** (`pt.json`, `en.json`, `es.json`):
- Renomear `anamnesis.subarea.superior` → "Superior (acrômio / trapézio)" / "Superior (acromion / trapezius)" / "Superior (acromion / trapecio)"
- Atualizar `anamnesis.shoulder.superior_desc` → descrição sobre região do acrômio e trapézio superior
- Adicionar `anamnesis.subarea.posterior_shoulder` com descrição
- Adicionar `anamnesis.scapula_question`, `anamnesis.scapula.yes`, `anamnesis.scapula.no`

**Interface `AnamnesisData`**: adicionar campo `hasScapulaPain: string` (default `""`)

## 2. Personalizar upsell no PDF da avaliação básica

**Arquivo:** `src/utils/generatePdf.ts` (linhas 719-765)

Usar `painRegions` (já disponível em `options`) para identificar qual questionário validado seria aplicado na avaliação premium e personalizar os bullets:

- Mapear `painRegions` → questionário correspondente usando a mesma lógica de `getQuestionnairesForRegions` de `questionnaireData.ts`
- Substituir o bullet genérico "Questionários validados (KOOS, SPADI, ODI, DASH...)" por um específico:
  - Ex ombro: "Questionário SPADI — específico para limitação e dor no ombro"
  - Ex joelho: "Questionário KOOS — específico para função e dor no joelho"
  - Fallback genérico se não houver mapeamento

- Adicionar mensagem motivacional após os bullets:
  - PT: *"Já tenho uma boa ideia por onde começar seu tratamento! Adquira a avaliação premium para refinar nosso plano terapêutico e receber todas as orientações disponíveis! Vamos juntos resolver essa dor."*
  - EN: *"I already have a good idea of where to start your treatment! Get the premium assessment to refine our treatment plan and receive all available guidance! Let's solve this pain together."*
  - ES: *"¡Ya tengo una buena idea de por dónde empezar tu tratamiento! Adquiere la evaluación premium para refinar nuestro plan terapéutico y recibir todas las orientaciones disponibles. ¡Vamos juntos a resolver ese dolor!"*

## Resumo de arquivos alterados

1. `src/components/assessment/AnamnesisForm.tsx` — sub-áreas do ombro + campo escápula
2. `src/locales/pt.json` — traduções novas/atualizadas
3. `src/locales/en.json` — traduções novas/atualizadas
4. `src/locales/es.json` — traduções novas/atualizadas
5. `src/utils/generatePdf.ts` — upsell personalizado por região

