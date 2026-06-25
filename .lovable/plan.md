# Importação de Dados Externos → Dados Nativos Aliv.iA

Transformar arquivos vindos de outros softwares (CSV, JSON, Excel, PDF, ZIP exportado pelo próprio Aliv.iA) em registros nativos: pacientes, avaliações, evoluções, sessões, programas, anexos — com o **mesmo DNA** dos dados criados dentro do sistema.

---

## 1. Onde fica o acesso — opções para você escolher

Recomendo **A** como padrão; **B** como alternativa.

**Opção A — Card próprio "Importar dados", lado a lado com Exportar** (recomendada)
- Mesma aba `Configurações / Dados` do ProDashboard, ClinicDashboard e ClinicDemo.
- Dois cards irmãos: `ExportDataCard` e `ImportDataCard`.
- Vantagem: simetria visual, separação mental clara entre "tirar" e "trazer", permite descrições e avisos próprios (LGPD, deduplicação, rollback).

**Opção B — Card único "Backup & Migração" com 2 abas internas**
- Um card com tabs `Exportar | Importar`.
- Vantagem: ocupa menos espaço; desvantagem: mistura fluxos com riscos bem diferentes (export é seguro, import muta o banco).

**Opção C — Página dedicada `/migrar` acessível pelos dois cards**
- Útil se quisermos um wizard multi-step em tela cheia (Upload → Pré-visualização → Mapeamento → Confirmação → Resultado).
- Recomendado **só se** prevemos importações grandes/recorrentes.

**Acesso adicional em ambos os modos**: dentro de `Pacientes`, botão "Importar pacientes" no header da lista, abrindo o mesmo modal já filtrado para escopo "apenas pacientes" — atalho para o caso mais comum.

> Minha sugestão: **A** + atalho no header de Pacientes. Confirme antes de eu implementar.

---

## 2. Formatos aceitos

| Formato | Uso típico | Estratégia |
|---|---|---|
| `.zip` Aliv.iA | Migração entre contas/clínicas | Leitura direta do `manifest.json` + JSONs nativos, sem IA |
| `.csv` / `.xlsx` | Planilhas de pacientes, agenda, evoluções | Parser tabular + IA para mapear colunas |
| `.json` | Exports de outros sistemas | IA infere shape e mapeia |
| `.pdf` / imagem | Avaliações soltas | Reusa fluxo `interpret-external-assessment` |
| Múltiplos arquivos | Mistura dos acima | Processados em lote |

Limite inicial: **20 MB por arquivo**, **até 50 arquivos** por importação (mesmo limite atual de uploads).

---

## 3. Pipeline de transformação (o "DNA" Aliv.iA)

```text
Upload
  → Parse (papaparse / xlsx / JSON.parse / pdf+IA)
  → Normalização (UTF-8, datas ISO, trim, telefone/CPF mask)
  → Detecção de schema via IA (Gemini Flash, edge function nova)
  → Mapeamento coluna→campo Aliv.iA + score de confiança
  → Pré-visualização editável pelo usuário
  → Deduplicação (email/CPF/nome+nascimento)
  → Validação Zod por entidade
  → Inserção transacional + rollback em erro
  → Relatório final (criados/atualizados/ignorados/erros)
```

### 3.1 Quando a IA entra
- **Detecção de cabeçalho/shape**: dado um sample de 20 linhas, IA retorna mapa `{ colunaOrigem → campoAlivia | "external" | "ignore" }` + confiança.
- **Classificação de entidade**: se o arquivo não declara, IA decide se é `patients`, `assessments`, `session_notes`, `appointments`, `pain_diary`, etc.
- **Normalização de texto livre**: queixa principal, história clínica, exames complementares — IA limpa formatação mas **não inventa** conteúdo.
- **Nunca**: IA não preenche campos clínicos vazios, não infere diagnóstico, não cria red flags.

### 3.2 Campo "Informações externas" (reuso do padrão dinamometria/avaliação externa)
Toda entidade nativa ganha um campo JSON `external_import_data` (já existe lógica análoga em assessments). Tudo que **não** mapear para campo conhecido vai pra lá, preservando 100% dos dados originais e exibido em accordion "Dados importados de outro sistema" no prontuário.

---

## 4. Mapeamento por entidade

Cada destino tem mapeadores determinísticos + fallback IA:

- **Patients** → `full_name, email, phone, cpf, birth_date, gender, address, notes, external_import_data, professional_id, clinic_id`. Dedup por `email` (primário) ou `cpf` ou `nome+data_nascimento`.
- **Assessments** → cria registro `type='professional'`, `status='completed'`, com `chiefComplaint, history, painScore, painRegions, romTable, strengthTable, functionalTests, diagnosis, clinicalImpression`. Campos não mapeados → `additional_external_info`.
- **Session notes / evoluções** → vincula ao paciente por email/nome; texto preservado.
- **Pain diary** → linhas `data, score` por paciente.
- **Appointments / agenda** → reusa parser do `parse-schedule-image` para CSVs de agenda.
- **Exercise programs** → opcional, fase 2.
- **Anexos (PDFs/imagens dentro de ZIP)** → vão para `patient_files` / `patient_photos` com `source='imported'`.

---

## 5. Cuidados para alocar nos lugares certos

1. **Sempre vincular ao profissional/clínica logado**. Nunca permitir importar para outro professional_id.
2. **Sandbox em modo demo**: import roda 100% client-side com mocks, não toca banco — útil para o usuário testar.
3. **Dry-run obrigatório**: nenhuma inserção sem o usuário confirmar o preview.
4. **Deduplicação configurável**: opções "criar novo", "mesclar no existente", "ignorar".
5. **Idempotência**: cada importação recebe `import_batch_id`; permite desfazer em 1 clique nas próximas 24h.
6. **Transação por entidade**: se falhar metade, faz rollback do batch.
7. **LGPD**: aviso explícito de que o profissional declara ter consentimento dos pacientes; log em `clinic_assessment_logs`/novo `import_logs`.
8. **PII em logs**: nunca logar conteúdo, só contagens e hashes.
9. **Anti-abuso clínica**: secretárias/intern não podem importar (só owner/admin/therapist).
10. **Validação Zod estrita**: linhas inválidas vão para `erros.csv` baixável, nunca para o banco.

---

## 6. UX do wizard (modal `ImportDataModal`)

```text
Step 1 – Upload         arrasta arquivos, mostra tamanho/tipo
Step 2 – Detecção       IA classifica cada arquivo; usuário confirma/ajusta tipo
Step 3 – Mapeamento     tabela "Coluna origem → Campo Aliv.iA" editável,
                         badge de confiança, opção "Enviar para external_import_data"
Step 4 – Pré-visualização  10 primeiras linhas já como ficariam no Aliv.iA,
                            destaca duplicatas e erros
Step 5 – Confirmação    contagens + checkbox LGPD
Step 6 – Resultado      criados/atualizados/erros + botão "Desfazer"
```

Progresso por etapa (igual ao export), cancelável.

---

## 7. Backend

- Nova migration: `import_batches (id, user_id, clinic_id, source_filename, status, summary jsonb, created_at, expires_undo_at)` + GRANTs + RLS.
- Coluna `external_import_data jsonb` em `patients`, `assessments`, `session_notes`, `pain_diary_entries`, `professional_appointments` (se ainda não houver) + `import_batch_id` em todas.
- Edge function `import-detect-schema` (Gemini Flash) — só recebe **amostras anonimizadas** (reusa `anonymizePatient`/`scrubText`).
- Edge function `import-commit` (service role) — recebe payload já validado do client, executa em transação, retorna relatório.
- Edge function `import-undo` — apaga por `import_batch_id` enquanto `expires_undo_at > now()`.

---

## 8. Modo demo

Reusar `mockPatientData` para simular um CSV externo. O wizard roda inteiro sem chamar edge functions: detecção devolve resultado fixo, commit apenas mostra "X pacientes seriam criados". Mesmo padrão do export demo.

---

## 9. Fora de escopo nesta primeira versão

- Importação contínua/integração via API de terceiros (Vivo Saúde, iClinic etc.).
- Migração de fotos/vídeos > 20 MB.
- Mapeamento automático de exercícios para a `exercise_library`.

---

## 10. Perguntas antes de implementar

1. **Onde colocar?** Opção A, B ou C da seção 1?
2. **Quem pode importar em clínica?** Apenas `owner/admin/therapist`, ou também `intern`?
3. **Undo**: janela de 24h é suficiente, ou prefere 7 dias?
4. **Atalho extra no header de Pacientes**: incluir já ou deixar pra v2?

Posso seguir com defaults (A, sem intern, 24h, com atalho) se você só responder "ok".
