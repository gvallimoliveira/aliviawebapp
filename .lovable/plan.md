## Objetivo

Tornar o Modal de Avaliação Manual mais prático para o uso real em consulta, sem quebrar PDFs, prontuário e raciocínio da IA. As mudanças se concentram em UI/UX da anamnese + um novo fluxo de "questionários pendentes" vinculados à própria avaliação (sem virar reavaliação).

---

## 1. Campo "História da queixa" 1.5x maior

- Em `ManualAssessmentModal.tsx`, no Step 1 (Anamnese), aumentar o `<Textarea>` do `history` de `rows={3}` para `rows={5}` e adicionar `className="... resize-y min-h-[140px]"`.
- Manter `chiefComplaint`, `aggravating`, `relieving` etc. com tamanho atual — só "história" cresce, pois é onde o fisio mais escreve.

## 2. Novo campo "Observações clínicas adicionais" (após Red Flags)

- Adicionar estado `additionalClinicalNotes: string` no modal.
- Renderizar abaixo da lista de red flags no Step 2, com `Textarea rows={4}`, label "Observações clínicas adicionais (opcional)" e helper "Use para registrar achados que não se encaixam nos campos acima (ex.: contexto familiar, suspeita clínica, compensações, observações comportamentais)".
- Tais achados anotados pelo fisio devem ser utilizados dentro do raciocínio da IA para impressao clinica, prontuário e sugestao de testes subsequentes nesse modal de avaliação manual.  
- Persistir dentro de `anamnesis_data.additionalClinicalNotes` (não cria coluna nova).
- Surfaçar no PDF e em `AssessmentView` logo após a seção de red flags, e incluir o texto no prompt da IA em `generate-diagnosis` / `generate-treatment` quando presente.

## 3. Tipo de dor por região (quando há >1 região)

Hoje `painType` é único para toda a avaliação. Vamos manter retrocompatibilidade e estender:

- Novo estado `painTypesPerRegion: Record<string, string>` no modal.
- Comportamento na UI do Step 1:
  - 1 região marcada → segue como hoje (select único de tipo de dor).
  - 2+ regiões → o select global vira "Tipo de dor padrão" (default) e abaixo do bloco de "Nota de dor por região" aparece um bloco gêmeo "Tipo de dor por região", com um `<Select>` por região (mesmas opções: local, irradiada, queimação, formigamento, latejante, pontada). Default = `painType` global.
- Persistência:
  - Em `anamnesis_data` salvar `painType` (compatibilidade) **e** `painTypesPerRegion`.
  - Em `assessments.pain_regions` permanece o array de IDs.
- Exibição em `AssessmentView`, PDF e prompt da IA: quando `painTypesPerRegion` existir, listar "Região: tipo (nota/10)" por linha.

## 4. Questionários adiados — link vinculado à avaliação manual

### Problema

Com várias regiões marcadas, o Step 3 fica longo demais e o paciente perde paciência preenchendo na hora. O fisio quer ter a opção de poder finalizar a avaliação sem questionários e mandar um link depois — mas esse link **não pode** virar uma reavaliação nova; tem que cair na mesma avaliação.

### Solução: usar a tabela `pending_questionnaires` que já existe

Hoje o próprio modal já insere linhas em `pending_questionnaires` para questionários de especialidade agendados (linha 844). Vamos generalizar:

1. **Toggle no Step 3 do modal**: "Enviar questionários para o paciente preencher depois". Quando ligado:
  - Esconde o bloco de questionários do modal.
  - Mostra preview com lista de questionários que seriam aplicados (derivados de `painRegions`) e explicação: "Esses questionários ficarão vinculados a esta avaliação. Você receberá os resultados aqui mesmo quando o paciente concluir."
  - Sugerimos ligar o toggle automaticamente quando `painRegions.length >= 3`.
2. **Ao salvar a avaliação**:
  - Para cada questionário aplicável + para cada questionário de especialidade já agendado, inserir uma linha em `pending_questionnaires` com:
    - `assessment_id` = id da avaliação recém-criada
    - `patient_id`, `professional_id` / `clinic_id`, `questionnaire_id`
    - `pain_regions` (snapshot) para o caso de re-cálculo
    - `token` (já gerado pelo schema atual)
  - Gerar uma URL única do tipo `/pending-questionnaires/:assessmentToken` (ver passo 4) e encurtar com `createShortAppLink`.
3. **Nova página pública `PendingQuestionnairesForAssessment**` (ou rota reaproveitando `PendingQuestionnaire.tsx`):
  - Recebe um token por avaliação (`assessments.pending_token`, coluna nova) e lista todos os `pending_questionnaires` daquela avaliação que ainda estão `pending`.
  - Cada submissão fecha (`status = 'submitted'`) a linha e grava o resultado no `assessments.test_results` (merge), garantindo que o relatório / impressão clínica / PDF passe a refletir os novos dados.
4. **Migration**:
  - `assessments.pending_token text unique` (gerado por trigger ou app) + `pending_questionnaires.assessment_id` já existe? Conferir e adicionar se necessário, mais index. RLS: leitura pública por token (igual ao fluxo de `assessment_token`).
5. **Link disponível pós-criação**:
  - Logo após salvar a avaliação, o modal mostra um passo "Link de questionários pendentes pronto" com botões "Copiar link", "WhatsApp" e "Fechar".
  - Ao reabrir a avaliação para edição (modal de edição), exibir um bloco fixo no topo: "Questionários pendentes (3 de 5 respondidos) — link: copiar / WhatsApp / encerrar pendência". Status calculado por `count(status='pending')` na tabela.
6. **Encerrar pendência manualmente**: botão "Encerrar pendência" no bloco — marca todas as linhas restantes como `cancelled` e remove o link.
7. **Automação total (zero interação extra)**: o fisio só precisa marcar o toggle no Step 3 e clicar salvar. A criação das `pending_questionnaires`, do token, do short link e do bloco no modal acontece sozinha. Nenhum desvio pelo modal de reavaliação.

### Ajuste secundário no `ReassessmentConfigDialog`

Mesmo com o novo fluxo, o modal de reavaliação continua existindo para outros casos. Forçar a regra que o usuário pediu:

- Se `questionnaire` for marcado, `painmap` é marcado e travado (`disabled`) com tooltip: "Questionários dependem do mapa de dor — eles ficam vinculados às regiões marcadas".
- Se `painmap` for desmarcado, `questionnaire` é automaticamente desmarcado.
- Texto explicativo no topo do bloco "Outras etapas".

---

## Arquivos afetados

```text
src/components/dashboard/ManualAssessmentModal.tsx        (todos os 4 pontos)
src/components/dashboard/patient-evolution/ReassessmentConfigDialog.tsx  (ponto 4 — vínculo painmap↔questionnaire)
src/pages/AssessmentView.tsx                              (mostrar observações + tipo de dor por região)
src/utils/generatePdf.ts                                   (mesmo)
src/lib/anamnesisCompat.ts                                 (mapear novos campos)
supabase/functions/generate-diagnosis/index.ts            (incluir novos campos no prompt)
supabase/functions/generate-treatment/index.ts            (idem)
src/pages/PendingQuestionnaire.tsx OU nova página         (listar pendências por avaliação)
src/App.tsx                                                 (nova rota /pending-questionnaires/:token)
supabase/migrations/<novo>.sql                             (pending_token + RLS + grants)
src/locales/pt.json | en.json | es.json                    (novas strings)
.agents/memory/features/*.md                               (registrar fluxo de questionários adiados)
src/pages/Support.tsx + src/pages/ClinicSupport.tsx       (documentar nova feature em PT/EN/ES)
```

## Validações antes de fechar

- Criar avaliação manual com 1 região (fluxo legado) → PDF e prontuário inalterados.
- Criar com 4 regiões + toggle "adiar questionários" ligado → avaliação salva, link gerado, paciente preenche, dados aparecem na mesma avaliação.
- Reabrir modal de edição → bloco de pendentes mostra progresso correto.
- Modal de reavaliação: marcar "questionários" trava painmap; desmarcar painmap remove questionários.

## Pontos abertos para confirmar antes de implementar

1. Quando o paciente terminar de responder os questionários pendentes, devo **regenerar automaticamente** a hipótese diagnóstica / tratamento com os novos dados, ou apenas notificar o fisio e deixar a regeneração manual (botão "Atualizar raciocínio com novos questionários")? Minha sugestão: notificar + botão manual, para não sobrescrever um diagnóstico que o fisio já validou.
2. Prazo de validade do link de questionários pendentes — sugiro 30 dias, com possibilidade de o fisio renovar pelo bloco no modal de edição.