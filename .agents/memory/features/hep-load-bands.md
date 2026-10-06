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

Studio Aliv.iA: comunicar HEP e controle de carga com objetividade e venda natural, pelo benefício concreto; distinguir estimativa de esforço alvo da resposta real do paciente. Reaproveitar kit, diferenciais e ecossistemas sem novos controles.

Nas artes sobre HEP, explicitar o significado: Programa de exercícios domiciliares. Em todas as marcas e temas, evitar o bordão “O custo aparece na rotina”; consequências devem fluir com conectivos naturais e variados, sem repetir uma fórmula fixa.
