# Página do paciente — hipótese unificada, CTA discreto e prontuário com templates

## 1. Hipótese Diagnóstica + Hipótese Final (um só card)

O card "Hipótese Final (Profissional)" deixa de existir como card separado. Tudo passa a viver dentro de "Hipótese Diagnóstica":

- Título com badge "Revisada pelo fisioterapeuta" quando houver override (comportamento atual mantido).
- Texto exibido: hipótese final se existir, senão a da IA. Abaixo, em fonte pequena, a sugestão original da IA quando sobrescrita.
- Ação discreta no rodapé do card: link/botão fantasma "Ajustar / sobrescrever hipótese" — visível apenas para PRO autônomo e owner/therapist da clínica (mesma regra de permissão de hoje).
- Ao clicar, o formulário (Concordo com a IA / Ajustar + textarea + salvar/cancelar) expande **dentro** do próprio card, sem abrir novo card.
- Regras de conteúdo, limite de 200 caracteres, restauração da sugestão da IA e auditoria de data continuam iguais.

## 2. Convite de plano de tratamento discreto

Hoje há dois blocos grandes ("Plano de Tratamento Personalizado" + "Outras avaliações sem plano de tratamento") que cortam a leitura do prontuário. Passa a ser:

- Uma linha discreta **dentro do card de Hipótese Diagnóstica**, abaixo da hipótese: "Gerar plano de tratamento para *cefaleia tensional*?" com um botão pequeño ("Gerar plano" ou "Desbloquear plano — R$ …" fora do modo clínica). A condição citada é a da última avaliação com hipótese.
- Quando o plano já existe: mesma linha discreta em tom neutro/verde com "Plano de tratamento disponível · Ver plano".
- Pagamento confirmado pendente de geração: mesma linha, com botão "Gerar agora".
- As outras avaliações sem plano deixam de ter card próprio; entram como um link discreto ("Outras condições sem plano — 1") que abre um pequeno painel colapsável no fim do bloco de avaliações, cada item com data, hipótese, região e um botão pequeno de gerar. Sem faixas coloridas grandes.
- A âncora `#treatment-unlock-section` e o highlight (ring) usados por links externos continuam funcionando, apontando agora para o card da hipótese.

## 3. Prontuário de Evolução — observação, pré-preencher e templates

Cada registro de sessão passa a ter dois campos:

- **Evolução** — o que foi realizado (campo atual).
- **Observação** — campo separado, opcional (percepções, intercorrências, combinados).

Novos atalhos no formulário:

- **Pré-preencher com evolução anterior**: copia evolução + observação do último registro do paciente para o formulário (editável antes de salvar). O botão "repetir hoje" já existente por item continua.
- **Modelos de evolução (pessoais)**: 
  - "Salvar como modelo" no formulário (pede um nome).
  - Seletor "Usar modelo" que lista os modelos do profissional e preenche os dois campos.
  - Gerenciar: renomear/excluir modelo dentro do próprio seletor.
- A listagem mostra a observação como bloco secundário, com rótulo próprio, e mantém expandir/recolher, editar, duplicar e excluir.
- A impressão clínica da IA passa a receber também a observação (hoje já recebe o conteúdo das sessões).

## 4. Nova ordem dos blocos da página do paciente

Agrupada por lógica: quadro clínico → histórico → medidas → documentos → ferramentas.

```text
1. Cabeçalho do paciente (nome, e-mail, ações)
2. Fisioterapeuta(s) responsável(eis)   [modo clínica]
3. Hipótese Diagnóstica  (inclui hipótese final + convite de plano de tratamento)
4. Impressão Clínica
5. Anamnese — última avaliação (colapsável)
6. Linha do tempo das avaliações
7. Evolução da dor + Mapa de dor comparativo
8. Evolução dos questionários
9. Prontuário de Evolução (sessões + observação + templates)
10. Notas de voz
11. Dinamometria — Força Muscular
12. Arquivos e fotos
13. Programas de exercícios (HEP) enviados
14. Avaliações do paciente — abrir relatório completo
```

Mudanças em relação ao atual: prontuário de evolução sobe para logo depois dos gráficos (fluxo de atendimento do dia a dia), notas de voz ficam ao lado dele, e os blocos de "desbloquear plano" saem do meio da página.

## Detalhes técnicos

- `src/components/dashboard/patient-evolution/PatientDetailView.tsx`: fundir `DiagnosticHypothesisBlock` com `FinalHypothesisEditor` (modo inline), substituir os dois cards de unlock por `TreatmentInviteRow` + painel colapsável de outras condições, reordenar o JSX conforme a lista acima.
- `src/components/dashboard/FinalHypothesisEditor.tsx`: passa a expor um modo "inline" (sem Card/CardHeader próprios) reutilizado pelo card de hipótese; lógica de save intacta.
- `src/components/dashboard/patient-evolution/shared.tsx`: adicionar variante compacta de `TreatmentUnlockCTA` (linha + botão pequeno), mantendo a lógica de pagamento/geração existente.
- Banco (migração):
  - `session_notes`: nova coluna `observation text` (nullable) — leitura/escrita pelas policies já existentes.
  - nova tabela `session_note_templates` (id, professional_id, name, content, observation, created_at, updated_at) com GRANTs para `authenticated`/`service_role` e RLS restrita a `professional_id = auth.uid()`.
- `src/components/dashboard/SessionNotesSection.tsx`: segundo textarea, botão de pré-preencher, seletor/salvamento de modelos, exibição da observação na lista.
- `supabase/functions/generate-clinical-impression`: incluir `observation` no payload de `sessionNotes`.
- i18n pt/en/es para os novos rótulos; `Support.tsx` + `ClinicSupport.tsx` atualizados com a novidade de templates de evolução.
