# Entrada profissional de dados cardiovasculares (monitor cardíaco)

## Objetivo
Hoje os dados cardio só entram pelo check-in do paciente. Criar uma entrada feita pelo fisioterapeuta, no prontuário, para lançar sessões medidas com monitor cardíaco (cinta, relógio ou oxímetro). Esses dados alimentam o planejamento e o controle de carga.

## O que o fisioterapeuta verá
- No controle de carga do prontuário, um botão **"Lançar sessão monitorada"**.
- Duas formas de preencher:
  1. **Print da tela do app do monitor**: a IA lê duração, FC média, FC máxima, tempo por zona e SpO₂ (quando houver). Você revisa antes de salvar. Usa créditos só nessa leitura.
  2. **Digitação manual**: os mesmos campos, sem custo.
- Campos: data, frente (Fisioterapia, Academia/força, Outro esporte, Cardio/corrida), duração, PSE informada pelo paciente, FC média, FC máxima, minutos por zona (Z1–Z5), SpO₂ mínima (opcional), observação.
- A prévia mostra as duas cargas antes de salvar:
  - **Carga por PSE (sRPE)** = duração × PSE
  - **Carga por FC (TRIMP)** = estimada pelos minutos em cada zona, calculadas a partir do teto de FC do perfil do paciente
- Alerta na hora se a FC máxima passar do teto do perfil ou se a SpO₂ ficar abaixo de 92%. Só na tela, sem notificação no celular.

## Como se junta ao check-in do paciente
- Se já existir check-in da mesma data e frente, os registros **se juntam numa só sessão**: os dados do monitor vêm do seu lançamento, e a percepção do paciente (PSE, prontidão, comentário) vem do check-in.
- Se a PSE vier dos dois lados, ficam as duas visíveis. O cálculo usa a sua, e a diferença aparece como "percepção do paciente".
- Nenhuma sessão é contada duas vezes no ACWR.

## Onde os dados são usados
- Dose percebida no microciclo (comparada com a planejada, faixa 0,90–1,10).
- Carga aguda/crônica e ACWR, com os limites do perfil cardiovascular.
- Matriz ACWR × FC de repouso e planejamento automático da semana seguinte, que poderá usar a carga por FC quando ela existir.
- Gráfico no prontuário com sRPE e TRIMP lado a lado, para comparar a percepção com a resposta cardíaca.

## Suporte
Atualizar o FAQ do Suporte profissional e do Suporte da clínica (pt/en/es) com uma explicação curta da entrada pelo prontuário e do TRIMP.

## Detalhes técnicos
- Tabela `cardio_session_logs` (patient_id, professional_id, session_date, front, duration_min, rpe, hr_avg, hr_max, zone_minutes jsonb, spo2_min, trimp, srpe, source 'manual'|'print', notes, srpe_entry_id nullable), com RLS por `can_access_patient`, mais GRANTs.
- Junção com `srpe_entries` pela mesma data e frente: vincula a sessão existente ou cria uma; a agregação de carga considera uma sessão por vínculo.
- Módulo puro de cálculo `cardioLoad.ts` (TRIMP de Edwards: pesos 1–5 por zona; zonas como % do teto/FCmáx do perfil), com testes unitários.
- A leitura de print reutiliza a Edge Function que já lê prints de cardio, com um modo "profissional" que valida o acesso ao paciente.
- Componente `ProfessionalCardioEntry.tsx` no painel de controle de carga do prontuário. Botões com `type="button"`.
- Registro da decisão em AGENTS.md.
