# Avaliação manual como continuação da pré-avaliação

## Ideia
Ao abrir a avaliação manual para um paciente que já respondeu um link de pré-avaliação (ainda não "completada" pelo profissional), o sistema pergunta como começar:

- **Continuar a pré-avaliação de [data]** (sugerido) — o formulário abre já preenchido com tudo que a paciente respondeu: queixa, história, mapa de dor e notas por região, saúde geral e medicações, red flags, triagem de mecanismo e questionários (ex.: SPADI, ODI, SRS-22r). Você só acrescenta e refina: exame físico, ADM, dinamometria, testes, hipótese e plano.
- **Começar do zero** — fluxo atual, sem nada pré-preenchido.

## Como fica salvo
- A continuação **atualiza o mesmo registro** da pré-avaliação (não cria uma avaliação paralela). Assim a linha do tempo do prontuário mostra uma única avaliação de Louise, com os questionários dela continuando associados.
- As respostas originais da paciente são guardadas intactas como "versão do paciente" dentro do registro. No prontuário e no PDF aparece o selo "Pré-avaliação pelo link + complementada em consulta (data)", e campos que você alterou podem ser comparados com o que ela respondeu.
- Questionários já respondidos aparecem como "Respondido pela paciente em [data]" e não precisam ser refeitos; você pode reaplicar se quiser, e o novo resultado entra ao lado (histórico preservado).
- Red flags e hipótese "sob ressalva" seguem as regras atuais (justificativa e auditoria mantidas).
- Hipótese/plano: a IA só é chamada novamente se você pedir, já considerando os dados novos.

## Onde aparece
- Ao clicar em "Avaliar" ou "Avaliação manual" no paciente: aviso com as duas opções quando existir pré-avaliação pendente.
- No card da pré-avaliação no prontuário: botão "Completar em consulta".
- Rascunho da nuvem continua funcionando; se houver rascunho de continuação, ele é retomado.

## Detalhes técnicos
- Reaproveitar o preenchimento existente de `ManualAssessmentModal` (bloco `prefillData`) extraindo-o para um helper puro `assessmentToFormState`, usado também pelo modo edição.
- Nova prop/modo `continueFrom` = assessment do link: carrega via helper, salva com `update` no mesmo id, grava `anamnesis_data.patientSnapshot` (cópia das respostas originais, só na primeira continuação) e `anamnesis_data.completedInPerson = { at, by }`.
- Detecção de "pré-avaliação pendente": assessment do paciente vindo de link (pro/clínica) sem `completedInPerson`, mais recente que a última avaliação manual. Verificar na implementação qual campo identifica a origem do link.
- Respeitar acesso da clínica (somente membros com acesso ao paciente) e `can_access_patient`.
- Prontuário/PDF: selo de origem e seção opcional "Respostas originais da paciente".
- Suporte pt/en/es atualizado; teste do helper (campos mapeados, snapshot preservado na segunda edição).
