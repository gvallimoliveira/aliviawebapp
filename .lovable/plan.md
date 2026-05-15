## Parte 1 — Responsável Técnico no PDF (implementar agora)

### O que muda

Todo PDF profissional (autônomo e clínica) passa a ter, no rodapé da última página (acima do footer institucional), um bloco de **Responsável Técnico** com:

```
_________________________________
Nome Completo do Fisioterapeuta
CREFITO: 123456-F
Relatório emitido em 15/05/2026
```

### Regras de quem assina

- **PRO autônomo**: usa o `professional` logado (nome + crefito do registro `professionals`).
- **Clínica — therapist logado**: usa o nome + crefito do próprio terapeuta.
- **Clínica — owner ou secretary logado** (login institucional): usa nome + crefito do **owner fisioterapeuta** da clínica (busca em `professionals` pelo `owner_user_id`). Se o owner não tiver crefito cadastrado, mostra apenas o nome + aviso "CREFITO não cadastrado" e abre toast pedindo para preencher.
- **Modo paciente / link público sem profissional**: NÃO mostra bloco (mantém comportamento atual).

### Cadastro de CREFITO no modo clínica

Hoje o `professionals.crefito` é `NOT NULL` no fluxo de registro PRO, mas membros adicionados via convite de clínica podem não ter perfil profissional ou ter crefito vazio. Vou:

1. Adicionar um **banner "Complete seu CREFITO"** no dashboard do terapeuta de clínica quando faltar o dado.
2. Criar/abrir um pequeno modal `CrefitoCompletionModal` com input + máscara `123456-F` + validação de duplicidade (mesma da tela de registro PRO).
3. Salvar em `professionals` (criando o registro se ainda não existir, vinculado ao `user_id`).

### Mudanças técnicas

- `**src/utils/generatePdf.ts**`: nova prop `responsibleProfessional?: { name: string; crefito?: string }` em `PdfOptions` e `EvolutionReportOptions`. Renderiza o bloco antes do footer nas funções `generateAssessmentPdf`, `_buildPdfDoc` e `generateEvolutionReportPdf` (3 footers idênticos hoje — extrair helper `drawSignatureBlock(doc, pageY)`).
- **Novo helper `src/lib/getResponsibleProfessional.ts**`: recebe `{ user, activeClinic, professionalProfile }` e devolve `{ name, crefito }` aplicando as regras acima (busca o owner via `professionals` quando user é owner/secretary).
- **Atualizar 4 call sites**:
  - `ProDashboard.tsx` (linha 441) → passa o profissional logado.
  - `ClinicSecretaryDashboard.tsx` (linha 115) → busca owner da clínica.
  - `AssessmentView.tsx` (linha 146) → resolve via helper conforme contexto.
  - `TreatmentPlan.tsx` (linha 122) → passa profissional se houver.
- `**src/components/dashboard/CrefitoCompletionBanner.tsx**` (novo) + integração no `ProDashboard` para terapeutas de clínica sem crefito.
- **i18n** (pt/en/es): chaves `pdf.responsible_professional`, `pdf.crefito_label`, `pdf.issued_at`, `dashboard.crefito_missing_*`.

### Sem mudanças de banco

A coluna `professionals.crefito` já existe (`text NOT NULL` no PRO, mas nullable na variante listada). Vou validar que aceita preenchimento posterior — se for `NOT NULL` e bloquear inserts parciais, a alternativa é deixar criar o registro com placeholder e forçar o modal antes da primeira geração de PDF (decido após inspecionar o constraint na hora da implementação).

---

## Parte 2 — Assinatura digital + carimbo no PDF (planejamento)

### Contexto regulatório (BR)

- **CREFITO/COFFITO** aceita assinatura eletrônica em laudos desde que garanta autenticidade, integridade e não-repúdio.
- **Convênios e perícias** geralmente exigem **ICP-Brasil** (e-CPF A1/A3) para validade jurídica plena. Assinaturas "simples" (imagem + carimbo) servem para uso interno, mas podem ser recusadas em perícia judicial.

### Estratégia em 3 níveis (recomendo entregar em fases)

**Nível 1 — Assinatura visual + carimbo digital (MVP, sem dependência externa)**

- Profissional faz upload **uma vez** de imagem PNG transparente da assinatura manuscrita (drag & drop ou desenho em canvas com `react-signature-canvas`).
- Sistema gera carimbo automático com nome, CREFITO, cidade/UF, data/hora de emissão.
- Ambos são embutidos no PDF na última página.
- **Hash SHA-256 do PDF** é calculado e armazenado em nova tabela `pdf_signatures` (assessment_id, hash, signed_at, professional_id, signature_image_url). No rodapé do PDF imprime-se: `Hash de integridade: ab12...` + QR code apontando para `aliviawebapp.com.br/verificar/{hash}` que mostra publicamente data, profissional, CREFITO. Isto cobre integridade e auditoria interna.
- **Esforço**: ~2-3 dias. **Cobre**: uso clínico, prontuário, encaminhamentos. **Não cobre**: perícia judicial estrita.

**Nível 2 — Assinatura ICP-Brasil via provedor (validade jurídica plena)**

- Integrar com provedor cloud de assinatura (recomendados):
  - **Clicksign** (API REST, suporta e-CPF, fluxo simples, ~R$ 1-3/assinatura)
  - **D4Sign** (similar, foco saúde)
  - **ZapSign** (mais barato, ~R$ 0,50-1,50)
- Fluxo: PDF gerado → enviado via API → profissional assina pelo celular/desktop com seu certificado → callback retorna PDF assinado → armazenamos em `storage` e linkamos no `assessment`.
- Requer **secret do provedor** + assinatura paga por uso (cobrar do PRO ou incluir cota mensal no plano).
- **Esforço**: ~5-7 dias incluindo edge functions, webhook de callback, UI de status.
- **Cobre**: perícia, convênio, juntada em processo.

**Nível 3 — Carimbo de tempo qualificado (timestamp ICP-Brasil)**

- Adicional ao Nível 2: carimbo PAdES-T via provedor (Valid, Serpro). Necessário só para perícia judicial federal específica. Posterior, sob demanda.

### Decisões que precisam ser tomadas antes de implementar

1. Quero começar pelo **Nível 1 (visual + hash + QR)** ou já partir para **Nível 2 (ICP-Brasil)**? Nivel 1 
2. Se Nível 2: qual provedor (Clicksign, D4Sign, ZapSign)? Quem paga por assinatura — Aliv.iA absorve, repassa para o PRO ou cota inclusa no plano?
3. Assinatura é obrigatória em todo PDF profissional ou opt-in por relatório? 
4. Onde armazenar a página pública de verificação (`/verificar/{hash}`) — rota nova no app + tabela `pdf_signatures`?

### Arquitetura proposta (resumo Nível 1+2)

```
professionals
  + signature_image_url text
  + signature_canvas_svg text (fallback)

pdf_signatures (nova)
  id, assessment_id, professional_id, file_hash,
  signed_at, signature_method ('visual'|'icp'),
  external_provider_id, signed_pdf_url, verification_token

storage bucket: signatures (private)
edge functions:
  - sign-pdf-visual    (Nível 1)
  - sign-pdf-icp       (Nível 2, chama Clicksign/D4Sign)
  - sign-pdf-callback  (webhook do provedor)
rota pública: /verificar/:token  → mostra metadata + status
```

---

## Próximos passos

Confirma se posso seguir com a **Parte 1 agora** e me diga as decisões 1-4 da Parte 2 para eu detalhar o ticket de implementação da assinatura.