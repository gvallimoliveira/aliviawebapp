# Compromissos com cor própria e opção no agendamento manual

## Por que não ficou diferente
Ao importar, o compromisso é marcado internamente como "compromisso", mas não recebe um tipo de serviço próprio. A agenda então o pinta como "Fisioterapia" (verde-azulado).

## O que muda
1. **Nova categoria "Compromisso"** na lista "Serviço", com cor cinza (faixa, bolinha e legenda/filtro da agenda e do card "Agenda de hoje").
2. **Importação por print:** itens marcados "Não é paciente" passam a ser salvos como "Compromisso" e aparecem em cinza.
3. **Corrigir os já importados:** os compromissos que você já importou passam a aparecer em cinza também (ajuste dos registros marcados como compromisso).
4. **Novo agendamento manual:** ao escolher "Compromisso" no Serviço:
   - o campo de paciente vira "Descrição do compromisso" (ex.: Reunião de equipe);
   - nenhum cadastro de paciente é criado e não se pede e-mail;
   - opções de paciente (avaliação, lembretes ao paciente) ficam ocultas.
5. Suporte (pt/en/es) atualizado.

## Detalhes técnicos
- `ProSchedule.tsx`: adicionar `compromisso` em `SERVICE_TYPE_COLORS/DOT/LABELS` usando tokens neutros (`muted-foreground`); no salvar, pular criação/vinculação de paciente quando `service_type === "compromisso"` e gravar `external_import_data.kind = "commitment"`.
- `ProScheduleCard.tsx`: mesma entrada em SERVICE_DOT/LABELS/BORDER.
- `AgendaImportModal.tsx`: `service_type: isCommitment ? "compromisso" : undefined`.
- Atualização de dados: `service_type = 'compromisso'` onde `external_import_data->>'kind' = 'commitment'`.
- Teste curto garantindo que compromisso não gera cadastro de paciente.
