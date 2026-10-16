# Importação de agenda por print: decidir o cadastro de cada agendamento

## O problema
Hoje, todo agendamento lido no print cria um cadastro de paciente novo, sem checar quem já existe. Por isso "Rafa Lobianco" virou um segundo cadastro de "Rafael Lobianco". Compromissos que não são atendimentos (reunião, almoço, curso) também viram pacientes.

## O que muda na tela de revisão
Cada agendamento lido ganha um seletor **"Cadastro do paciente"** com 3 opções:

1. **Vincular a paciente existente** — lista de pacientes seus (ou da clínica) com busca. O agendamento passa a usar o nome oficial do cadastro (ex.: "Rafael Lobianco").
2. **Criar novo paciente** — cria o cadastro com o nome lido; você pode corrigir o nome antes.
3. **Não é paciente (compromisso)** — entra só na agenda, sem cadastro. Aparece com uma marca "Compromisso".

### Sugestão automática (você confirma)
- O sistema compara o nome lido com seus pacientes, aceitando apelidos e abreviações (Rafa ≈ Rafael, Gabi ≈ Gabriela, ignorando acentos e maiúsculas, comparando sobrenome).
- Se achar alguém parecido: vem marcado **"Vincular"** com o paciente sugerido e um selo "Possível: Rafael Lobianco".
- Se não achar: vem marcado **"Criar novo"**.
- Se o texto parecer compromisso (reunião, almoço, bloqueio, curso, pessoal, sem nome de pessoa): vem marcado **"Não é paciente"**.
- Nada é criado sem passar por essa tela; tudo pode ser trocado antes de importar.

### Extras
- Nome editável em cada linha.
- Resumo no rodapé: "3 vinculados · 1 novo · 2 compromissos".
- Se o mesmo nome aparece várias vezes no print, escolher uma vez vale para todos (ex.: Rafa em 3 dias → um só cadastro).
- Ao importar de novo o mesmo print, não duplica cadastros.

## Sobre o cadastro duplicado do Rafael
Não apago nada automaticamente. Posso, a seu pedido, transferir os agendamentos de "Rafa Lobianco" para "Rafael Lobianco" e arquivar o card duplicado (se ele não tiver avaliações).

## Pergunta em aberto (respondo com padrão se não preferir)
- Compromissos devem ter cor própria na agenda (cinza) — padrão: sim.

## Detalhes técnicos
- `AgendaImportModal.tsx`: carregar pacientes (clínica via `clinic_id` / autônomo via `professional_id`) ao abrir; estado por linha `{ mode: "link"|"create"|"none", patientId?, editedName }`; Combobox de busca (shadcn Command/Popover).
- Novo `src/lib/patientNameMatch.ts` (puro): normalização (acentos, caixa), mapa de apelidos pt-BR, pontuação por primeiro nome/prefixo + sobrenome; heurística de compromisso por palavras-chave. Testes em `src/test/patient-name-match.test.ts` (Rafa Lobianco → Rafael Lobianco; "Reunião equipe" → compromisso; nomes distintos sem vínculo).
- `professional_appointments` não tem coluna de paciente: vinculação grava o `full_name` do cadastro em `patient_name`; compromissos marcados em `external_import_data` (`{ kind: "commitment" }`) e `service_type` próprio para exibição — sem migração.
- Criação de pacientes: agrupar por nome normalizado e criar uma vez; pular quando já existir igual.
- Edge function `parse-schedule-image`: pedir campo opcional `is_patient` (dica ao classificador), sem custo extra.
- Suporte (Support.tsx, ClinicSupport.tsx, pt/en/es) atualizado.
