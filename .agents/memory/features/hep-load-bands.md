---
name: HEP load bands
description: Faixas de séries semanais por região no controle de carga (leve/moderada/alta)
type: constraint
---
Séries semanais por região no HEP (função `weeklyRegionVolume` de `src/lib/hepLoad.ts`):
- Leve: até 15 séries semanais
- Moderada: 16 a 29 séries semanais
- Alta: a partir de 30 séries semanais

Ponderação de objetivo na conta de carga: mobilidade/flexibilidade = 0; estabilização/propriocepção = 0,5; força = 1.
Esforço percebido alvo sempre entre 5 e 9: até 6 leve, até 7,5 moderado, até 9 intenso (RPE leve 5,5 · moderado 7 · intenso 8,5).

- Domínio da sessão (physio/gym/sport) é escolhido no modal do HEP (`exercise_programs.domain`, default physio) e classifica a dose planejada no microciclo; edição recarrega e regrava com o domínio escolhido.
