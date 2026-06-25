## Objetivo

Garantir que o botão **"Backup e exportação de dados"** (em `ExportDataCard.tsx`, usado no `ProDashboard` e na aba *Management* da clínica) realmente entregue um **prontuário completo, organizado e auditável** — não apenas dumps planos de tabelas com links que expiram em 1h.

## Diagnóstico atual (o que já levantei)

Hoje o `ExportDataCard` exporta apenas 7 categorias como CSV/JSON planos:
`patients · assessments · professional_appointments · professional_notes (solo) · assessment_voice_notes · patient_files (índice) · patient_photos (índice)`.

Lacunas críticas vs. a promessa feita ao usuário:

1. **Faltam tabelas essenciais do prontuário**
  - `session_notes` (evoluções por sessão) ← **indispensável**
  - `exercise_programs` + `exercise_program_items` + `exercise_completions` (HEP/plano)
  - `pain_diary_entries` (diário de dor)
  - `pending_questionnaires` (questionários respondidos pelo paciente)
  - `follow_up_emails` (histórico de acompanhamento)
  - `conversations` + `messages` (chat P2P)
  - `clinic_assessment_logs` (auditoria de overrides de hipótese — exigência clínica/legal)
  - `form_drafts` (rascunhos)
2. **Arquivos binários não vão no zip** — só `signed_url_1h`. Quem abrir o backup depois de 1h perde fotos posturais e documentos. Para um backup real precisamos bundlear os bytes (`patient-files` e `patient-photos` buckets).
3. **Sem organização por paciente** — tudo é dumpado como tabelas globais. O usuário pediu explicitamente *"pacientes em si com seus prontuários completos"*, sugerindo pastas.
4. **Modo demo não simula export** — `ExportDataCard` recebe `clinicId`/`professionalId` reais; em demo (`professional_demo`) não há ID, então o botão sequer aparece ou falha. Não há como o usuário pré-visualizar o formato.
5. **Notas privadas em clínica**: `professional_notes` só é incluída em modo solo. Em clínica o dono não consegue exportar notas dos terapeutas (pode ser proposital — confirmar).

## Plano de investigação e entrega

Vou dividir em 3 fases. Fase 1 é só análise (entrego um relatório); só depois implemento.

### Fase 1 — Auditoria (read-only, ~1 ciclo)

1. Mapear, via `supabase--read_query`, **todas as tabelas com `patient_email`/`patient_id`/`clinic_id`/`professional_id**` e cruzar com o que o export cobre hoje.
2. Validar **RLS de leitura** para cada tabela do escopo, garantindo que o `select` no client com a sessão do dono da clínica/profissional realmente retorna tudo (sem precisar de service role).
3. Conferir os buckets `patient-files` e `patient-photos`: tamanho médio, limites práticos para zipar no browser (JSZip aguenta ~500MB-1GB; acima disso precisamos de paginação/streaming ou edge function).
4. Entregar um **relatório curto** listando: tabelas cobertas, tabelas faltantes, tamanho estimado do zip por perfil, e decisão sobre binários (incluir sempre vs. opcional).

### Fase 2 — Reestruturação do export

Estrutura proposta do `.zip` (independente de modo):

```text
alivia-export-{slug}-{YYYY-MM-DD}.zip
├── manifest.json                 ← versão, escopo, contagens, checksums
├── README.txt                    ← como ler o pacote
├── clinica/  (ou profissional/)
│   ├── perfil.json + perfil.csv
│   ├── equipe.csv                (clinic_members, só clínica)
│   └── agenda.csv                (todos os appointments do escopo)
├── pacientes/
│   └── {iniciais}-{shortHash}/   ← uma pasta por paciente (anonimizada no nome)
│       ├── paciente.json + .csv
│       ├── avaliacoes/
│       │   └── {data}-{id}.json  (assessment + voice_notes + pending_questionnaires + clinic_assessment_logs daquela avaliação)
│       ├── evolucao/
│       │   ├── session_notes.csv
│       │   ├── pain_diary.csv
│       │   └── follow_ups.csv
│       ├── tratamento/
│       │   ├── programas.json    (exercise_programs + items + completions)
│       │   └── notas_privadas.csv (só do profissional logado)
│       ├── chat/
│       │   └── conversa-{id}.csv
│       ├── documentos/
│       │   ├── _index.csv
│       │   └── {file_name}       ← binário real (opt-in via checkbox)
│       └── fotos/
│           ├── _index.csv
│           └── {file_name}
└── tabelas_brutas/               ← dumps planos (compatibilidade/auditoria)
    ├── csv/*.csv
    └── json/*.json
```

Mudanças no `ExportDataCard.tsx`:

- Nova checkbox **"Incluir arquivos binários (fotos e documentos)"** — default **on**, com aviso de tamanho estimado.
- Reescrever `handleExport`:
  - Adicionar fetches das tabelas faltantes (lista acima).
  - Agrupar por `patient_email` montando a árvore de pastas.
  - Quando "binários" estiver ligado, baixar via `supabase.storage.from(...).download(path)` e adicionar com `zip.file(..., blob)`.
  - Calcular SHA-256 dos binários e gravar no `manifest.json` (auditoria/LGPD).
  - Anonimizar nomes de pasta com `initialsOf` + shortHash (helpers já existem em `src/lib/anonymizePatient.ts`); manter dados reais **dentro** dos arquivos.
  - Streaming/progresso: trocar toast estático por progresso ("Baixando 12/87 arquivos…") usando `JSZip` + contador.

### Fase 3 — Simulação no modo demo

Para o usuário conferir o formato sem precisar de dados reais:

1. Aceitar `mode="demo"` no `ExportDataCard` (renderizar quando `activeContext === "professional_demo"` ou em `ClinicDemo`).
2. No `handleExport`, se `mode === "demo"`, **não chamar o Supabase** — montar o mesmo zip a partir de:
  - `src/data/mockPatientData.ts`, `mockClinicData.ts`, `mockProDemoExtras.ts`, `mockManualAssessmentCase.ts`, `mockExternalAssessment.ts`.
  - Um placeholder `.txt` no lugar dos binários (ex.: `foto_postural_anterior.jpg → README_demo.txt` explicando que em produção viria o arquivo real).
3. Adicionar o card de export ao **ProfessionalDemo** e ao **ClinicDemo** com badge "(modo demo — dados fictícios)".
4. Resultado: o usuário clica e baixa um zip de exemplo, abre, valida a estrutura.

## Detalhes técnicos

- **Edge function vs. client-side**: manter no client (JSZip) por simplicidade e privacidade (dados não saem para nosso server). Se a Fase 1 mostrar zips >500MB comuns, adicionamos um modo "via servidor" depois (fora do escopo atual).
- **Performance**: paralelizar downloads de binários em lotes de 5 com `Promise.allSettled` para não travar a aba.
- **RLS**: nenhuma migration necessária — todas as tabelas já têm policies de leitura para o dono/terapeuta. Apenas confirmar em Fase 1.
- **Sem mudança no schema**, apenas no client (`ExportDataCard.tsx`, `Dashboard.tsx`, `ProDashboard.tsx`, `ProfessionalDemo.tsx`, `ClinicDemo.tsx`) + helpers novos em `src/lib/exportZipBuilder.ts`.
- **i18n**: adicionar chaves em pt/en/es para os novos rótulos.

## Entregáveis

1. Após **Fase 1**, devolvo um relatório no chat com os achados e peço seu OK antes de codar.
2. Em seguida implemento **Fase 2 + Fase 3** numa única PR.
3. Verifico via Playwright: (a) export demo gera zip com estrutura esperada; (b) export real (com seu usuário admin) baixa, abre e contém binários.

## Perguntas pendentes (vou pedir antes de implementar a Fase 2)

- Incluir binários por padrão ou opt-in? Opt-in 
- Em clínica, o dono pode exportar `professional_notes` de todos os terapeutas, ou cada terapeuta exporta as suas? Cada um exporta as suas 
- Limite máximo de tamanho antes de avisar/cancelar (ex.: alertar acima de 300MB)? Sim, verificar possibilidade de subdividir para conseguir fazer todo o backup/exportação desejada. 