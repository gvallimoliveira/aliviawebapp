## Problema

1. **Disclaimer acadêmico ausente no link do HEP.** O link `/hep/:token` (página `ExerciseProgram.tsx`) não mostra o aviso "Alivia Acadêmico — Documento de caráter acadêmico, sem valor profissional", mesmo quando o profissional está com `is_student = true`. O selo já é aplicado corretamente no PDF de relatório (`generatePdf.ts`) e na página de avaliação profissional (`ProfessionalAssessment.tsx`), mas não foi propagado para o HEP.

2. **Botão "Enviar via WhatsApp" do HEP não abre o WhatsApp no mobile.** No `CreateExerciseProgramModal.tsx`, `handleWhatsApp` faz `await createShortAppLink(...)` **antes** de chamar `window.open(...)`. Isso quebra o "user-gesture" no Safari/Chrome mobile e o popup é bloqueado silenciosamente. Os relatórios já contornam isso usando `openWhatsAppDeferred()` em `src/lib/whatsappShare.ts`, que reserva a aba de forma síncrona dentro do clique e só navega depois.

## Ajustes

### 1. `src/pages/ExerciseProgram.tsx` — exibir banner acadêmico

- Estender o tipo `Program.professional` com `is_student`, `student_institution`, `student_period`.
- No `select(...)` da query de `exercise_programs`, incluir esses três campos do join `professionals(...)`.
- Renderizar, logo no início do `<main>` (antes do cabeçalho centralizado), o mesmo bloco amarelo já usado em `ProfessionalAssessment.tsx` (linhas 444–464), traduzido para pt/en/es, quando `program?.professional?.is_student === true`. Texto idêntico ao do PDF/avaliação para manter consistência.
- Não tocar no fluxo demo (`token === "demo-shoulder"`): manter `is_student: false` no mock.

### 2. `src/components/dashboard/CreateExerciseProgramModal.tsx` — WhatsApp confiável no mobile

- Importar `openWhatsAppDeferred` de `@/lib/whatsappShare`.
- Reescrever `handleWhatsApp` para:
  1. Chamar `const wa = openWhatsAppDeferred();` **sincronamente** dentro do handler do clique (reserva a aba durante o gesto do usuário).
  2. Em seguida `await createShortAppLink(...)`.
  3. Em sucesso: `wa.send(\`Olá ${patientName}! Preparei seu programa de exercícios domiciliares. Acesse aqui: ${short}\`)`.
  4. Em erro: `wa.abort()` + toast de erro (sem alterar UX atual além de mostrar mensagem de falha).
- Não alterar `handleCopy` nem outros handlers.

### 3. Não alterar

- `PatientDetailView.tsx` já chama `window.open(wa.me/...)` direto no clique sem `await` — funciona, deixar como está.
- Edge function `agent-generate-hep` apenas posta o link no chat do agente; não há botão WhatsApp lá. Sem mudanças.
- PDF/relatórios e demais fluxos de share permanecem intactos.

## Validação

- Abrir um HEP gerado por uma conta com `is_student = true` → banner amarelo "Alivia Acadêmico" aparece no topo, com nome/instituição/período.
- Abrir um HEP de um fisioterapeuta formado → sem banner (comportamento atual).
- No modal pós-criação do HEP em desktop e mobile, clicar "Enviar via WhatsApp" → abre `wa.me` com o texto preenchido (mobile redireciona para o app instalado, igual aos relatórios).
