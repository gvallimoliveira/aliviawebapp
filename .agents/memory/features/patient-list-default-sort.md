---
name: Patient list default sort
description: Listagem de pacientes abre em "mais recentes" (último atendimento primeiro); A-Z fica como escolha do profissional
type: preference
---

- Ao abrir a listagem de pacientes, o padrão é **"mais recentes"** (quem teve atendimento/avaliação por último aparece primeiro), e não mais a ordem alfabética.
- O botão **"A-Z"** continua disponível e é uma escolha da sessão de uso — o profissional pode voltar a ele quando precisar, sem que isso altere o padrão das próximas aberturas.
- Motivo: no dia a dia corrido, o prontuário que se abre é o de quem foi atendido por último; a ordenação alfabética virou consulta pontual.
- Cobertura: `src/test/patient-list-sort.test.tsx` fixa a ordem inicial e a troca entre os dois modos.
