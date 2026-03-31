

## Relatório PDF via WhatsApp + Persistência da Página de Resultado

### Problema 1: WhatsApp envia texto puro
O botão de compartilhamento monta uma string de texto e abre `wa.me/?text=...`. Precisa gerar um PDF no padrão visual do app, fazer upload para storage, e compartilhar o link do PDF via WhatsApp.

### Problema 2: Perda de acesso à página após compartilhar
Ao clicar no WhatsApp no mobile, o usuário sai do app e pode perder o estado. Precisa persistir o resultado para que o usuário possa voltar e ver o diagnóstico + CTAs de compra.

---

### Solução

**1. Gerar PDF básico e fazer upload**

- Criar função `generateBasicReportPdf` em `src/utils/generatePdf.ts` — versão simplificada do relatório contendo apenas: hipótese, confiança, resumo e disclaimer (sem explanation/reasoning/recommendations que são premium)
- Criar bucket de storage `assessment-reports` (público) para hospedar os PDFs
- No botão WhatsApp do `DiagnosisResult.tsx`: gerar o PDF blob → upload para `assessment-reports/{assessmentId}.pdf` → compartilhar link público via WhatsApp

**2. Persistir resultado para retorno**

- Salvar `assessmentId` no `sessionStorage` quando o diagnóstico é exibido
- Criar rota `/assessment/result/:id` (ou reutilizar `AssessmentView.tsx`) que carrega o assessment do banco e renderiza o `DiagnosisResult` com os CTAs de compra
- O link compartilhado no WhatsApp aponta para essa rota, permitindo ao próprio usuário voltar

**3. Fluxo do botão WhatsApp (DiagnosisResult.tsx)**

```
Clique → loading state → gerar PDF blob → upload storage → montar mensagem WhatsApp com link do PDF → window.open(wa.me)
```

A mensagem no WhatsApp será:
```
🩺 Aliv.iA — Resultado da Avaliação

📋 Hipótese: {hypothesis}
📊 Confiança: {confidence}

📄 Relatório completo em PDF:
{link_do_pdf}

💡 Faça sua avaliação: {origin}
```

### Arquivos alterados

| Arquivo | Ação |
|---|---|
| `src/utils/generatePdf.ts` | Nova função `generateBasicReportPdf` (só dados básicos) |
| `src/components/assessment/DiagnosisResult.tsx` | Botão WhatsApp gera PDF, faz upload, compartilha link |
| `src/pages/Assessment.tsx` | Salvar assessmentId em sessionStorage no resultado |
| Migration SQL | Criar bucket `assessment-reports` público |

