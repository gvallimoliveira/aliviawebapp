

## Correção de 4 problemas no Painel Profissional

### Problemas e soluções

**1. Pacientes com 1 avaliação sumiram**
Os pacientes Aline, Marcelo, g1 e Derique têm `patient_email = null` no banco. A linha `if (!email) return;` no `PatientEvolutionDashboard` filtra todos eles. Solução: usar fallback para `patient_name` como chave de agrupamento quando email é nulo.

**2. "Sem dados de questionários para comparar"**
As avaliações da Alessandra têm `test_results = {}` (objeto vazio, não array). O filtro `Array.isArray(a.test_results)` retorna false. Na verdade, essas pré-avaliações profissionais não incluem o passo de questionários — então a mensagem "sem dados" é correta, mas deve ser mais clara (ex: "Nenhum questionário funcional foi aplicado nessas avaliações"). Quando houver dados reais de questionário, o código já funciona.

**3. Anamnese mostrando códigos do sistema**
Os valores da anamnese são chaves i18n (ex: `anamnesis.complaint.neck_pain`, `anamnesis.onset.gradual`). O `getAnamnesisFields` retorna o valor bruto. O PDF já tem uma função `translateKey` que converte essas chaves. Solução: importar/replicar essa lógica de tradução no `PatientEvolutionDashboard`.

**4. Questionários não exibidos no card do paciente e no PDF**
Os questionários já estão implementados corretamente no código (linhas 422-448 do dashboard e `renderTestResultsSection` no PDF). O problema é que as avaliações da Alessandra simplesmente não contêm dados de questionário — são pré-avaliações que não passaram pelo step de questionário. Para avaliações futuras que incluam questionários, os dados aparecerão. Mas vou garantir que o fallback para `test_results` como objeto vazio (não array) não quebre nada.

### Mudanças

**`src/components/dashboard/PatientEvolutionDashboard.tsx`**
- Agrupar por `patient_email || patient_name` como fallback para pacientes sem email
- Importar/criar função `translateKey` para traduzir valores de anamnese (mesma lógica do PDF)
- Tratar `test_results` como objeto vazio sem quebrar (normalizar para array)
- Melhorar mensagem de "sem questionários" para ser mais descritiva

**`src/utils/generatePdf.ts`**
- Normalizar `test_results` de objeto vazio para array vazio antes de processar (evitar crash)

