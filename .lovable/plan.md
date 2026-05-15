## Assinatura digital visual + carimbo no PDF

Decisões confirmadas:
- **Nível 1 apenas** (sem ICP-Brasil agora)
- **Opt-in por relatório** (toggle "Assinar este relatório" no momento da geração)
- **Sem página pública de verificação** (sem hash/QR/rota `/verificar`)

---

### Fluxo do usuário

1. **Cadastro único da assinatura** (uma vez, em "Conta" / configurações do profissional):
   - Tab "Assinatura digital" com 2 opções:
     - **Desenhar** com `react-signature-canvas` (mouse/dedo)
     - **Upload** de PNG transparente (preferível)
   - Preview + botão "Salvar assinatura" / "Substituir"
   - Imagem é salva em storage privado (bucket `signatures`) e a URL salva em `professionals.signature_image_url`

2. **Ao gerar PDF profissional** (PRO autônomo, clínica owner, clínica terapeuta):
   - Modal/diálogo de geração ganha um **switch "Assinar digitalmente este relatório"** (default: OFF)
   - Se ON e o profissional tiver assinatura cadastrada → embute imagem no bloco de Responsável Técnico
   - Se ON e não tiver → toast "Cadastre sua assinatura em Conta → Assinatura digital" + gera sem assinatura
   - Carimbo textual com nome, CREFITO, cidade/UF e data continua sempre visível (já feito na Parte 1)

---

### Mudanças técnicas

**Banco** (1 migração):
- `ALTER TABLE professionals ADD COLUMN signature_image_url text`
- Bucket privado `signatures` + policy: profissional só lê/escreve `{user_id}/signature.png`

**Frontend**:
- `src/components/account/SignatureManager.tsx` (novo) — tab desenhar/upload, salva no bucket
- Adicionar tab "Assinatura digital" em `src/pages/Account.tsx`
- Switch opt-in nos diálogos de geração de PDF:
  - `ProDashboard.tsx` (botão de relatório)
  - `ClinicSecretaryDashboard.tsx`
  - `AssessmentView.tsx`
  - `TreatmentPlan.tsx` (se aplicável)
- `src/utils/generatePdf.ts`:
  - `ResponsibleProfessional` ganha campo opcional `signatureImageUrl?: string`
  - `drawResponsibleBlock` desenha a imagem (max 60×25mm) acima da linha quando presente
  - Helper `loadImageAsDataUrl(url)` para baixar do storage privado via signed URL antes de embutir
- `getResponsibleProfessional.ts`: retornar também `signature_image_url` quando opt-in ativo (parametro `includeSignature: boolean`)

**Dependências**:
- `react-signature-canvas` (~30kb) — só carrega na página de Conta

**i18n** (pt/en/es):
- `account.signature_tab`, `account.signature_draw`, `account.signature_upload`, `account.signature_saved`
- `pdf.sign_this_report`, `pdf.no_signature_registered`

---

### Fora de escopo (confirmado)
- Hash SHA-256 do PDF
- QR code de verificação
- Rota pública `/verificar/:token`
- Tabela `pdf_signatures`
- Integração com Clicksign / D4Sign / ZapSign (Nível 2)

---

### Estimativa
~1 dia de implementação. Posso começar quando você aprovar.
