# Anotações do profissional na impressão clínica, hipótese e relatório

## O que foi confirmado
- A impressão clínica recebe as notas de sessão, mas não recebe as "Observações clínicas adicionais", o texto de "Testes / achados do exame" (ex.: gibosidade não significativa) nem os questionários complementares (SRS-22r e outros).
- A hipótese diagnóstica já lê as observações adicionais, mas não lê o texto dos testes e só considera o FABQ entre os questionários complementares.
- O relatório em PDF não mostra as observações adicionais nem o texto dos testes (a tela da avaliação mostra só as observações).

## O que muda (Louise e todos os próximos pacientes)
1. **Impressão clínica sem notas de sessão** — as notas de evolução deixam de entrar na impressão clínica.
2. **Anotações do profissional como fonte principal** — observações adicionais e texto dos testes entram na impressão clínica e na hipótese, com instrução para a IA tratá-las como achados do especialista, que têm prioridade sobre o relato do paciente e nunca são ignorados. Achados negativos (ex.: "sem gibosidade significativa") também são considerados.
3. **Questionários complementares** — SRS-22r e demais (escore, domínios e interpretação) entram na impressão clínica e na hipótese.
4. **Relatório** — o PDF e a tela da avaliação ganham as seções "Observações clínicas do profissional" e "Achados dos testes / exame físico".
5. **Louise** — o relatório já mostra as anotações dela assim que abrir de novo. Para a impressão e a hipótese, use "Regenerar" no prontuário: a IA só é chamada se você pedir (gasta créditos de IA).
6. Página de ajuda (pt/en/es) explica que as anotações do profissional guiam a IA.

## Detalhes técnicos
- `generate-clinical-impression`: remover bloco/instrução de `sessionNotes` e a chamada `fetchSessionNotes` em `patient-evolution/shared.tsx`; adicionar `additionalClinicalNotes`, `functionalTests` (texto) e `specialtyResults` resumidos; bumpar `PROMPT_VERSION` (invalida cache). Atualizar a memória "clinical-impression-depth".
- `generate-diagnosis`: incluir `functionalTests` (texto) e todos os `specialtyResults` no prompt, além das notas já presentes.
- `generatePdf.ts` (respeitando a largura de 158 mm e a proteção de títulos) e `AssessmentView.tsx`: renderizar os dois textos.
- Teste: helper puro que monta o contexto do profissional garante que observações, testes e SRS-22r entram, e que notas de sessão não entram.
- Deploy das duas funções; Support + ClinicSupport pt/en/es.
