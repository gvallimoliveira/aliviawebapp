# FABQ-Brasil: questionário psicossocial opcional (medo-evitação / catastrofização)

## O que é o FABQ-Brasil

Fear-Avoidance Beliefs Questionnaire, versão brasileira validada por Abreu AM, Faria CDCM, Cardoso SMV, Teixeira-Salmela LF — *Cadernos de Saúde Pública*, 2008 (adaptação transcultural do original de Waddell et al., 1993).

- 16 itens, escala 0–6 ("discordo totalmente" → "concordo totalmente").
- Duas subescalas pontuadas:
  - **FABQ-Trabalho (FABQ-W)** — 7 itens, 0–42. Corte de risco alto: ≥ 34 (risco moderado 29–33).
  - **FABQ-Atividade Física (FABQ-PA)** — 4 itens, 0–24. Corte de risco alto: ≥ 15.
- Tempo médio de aplicação: ~4 minutos.
- Interpretação clínica: crenças de medo-evitação elevadas predizem cronificação, pior resposta a exercício isolado e necessidade de abordagem com educação em dor + exposição gradual.

## Por que ele não entra na tabela por região

Os questionários atuais (ODI, SPADI, KOOS…) são selecionados pelas regiões marcadas no mapa de dor. O FABQ é **perfil do paciente**, não região — então ele entra na mesma família dos questionários de especialidade (cardio/geri), que já são sugeridos por sinais da anamnese e aplicados a critério do profissional.

## Quando aplicar (regras de sugestão propostas)

Novo domínio `psychosocial` (rótulo "Psicossocial / Yellow Flags"). O FABQ é **sugerido** — nunca obrigatório — quando pelo menos um gatilho ocorre:

1. Dor com duração > 3 meses (dor crônica).
2. Mecanismo de dor triado como **nociplástico** ou com sensibilização central (usa a triagem que já existe).
3. EVA ≥ 7 com incapacidade funcional alta no questionário regional (ODI/NDI etc. em faixa severa).
4. Palavras-chave na anamnese: medo de movimento, evitação, "tenho medo de piorar", cinesiofobia, catastrofização, afastamento/atestado, dor relacionada ao trabalho, LER/DORT.
5. Recidiva / tratamento anterior sem sucesso.
6. Sugestão manual: o profissional pode sempre abrir e aplicar mesmo sem gatilho.

Regra extra: se nenhum gatilho ocupacional aparece (paciente aposentado, sem vínculo), sugerir apenas a subescala **FABQ-PA** (4 itens, ~1 min) para não cansar.

## Onde ele aparece

1. **Avaliação manual (profissional/clínica)** — no painel de questionários sugeridos que já existe: aplicar agora inline, ou agendar como pendência com link para o paciente responder pelo celular.
2. **Reavaliação expressa** — nova etapa opcional no modal de configuração ("Perfil psicossocial — FABQ"), desmarcada por padrão. Reaplicar permite comparar o delta de medo-evitação, que é um dos melhores marcadores de progresso em dor crônica.
3. **Prontuário do paciente** — resultado no histórico com evolução em barras (mesmo padrão dos questionários validados) e semáforo de risco (verde / âmbar / vermelho por corte).
4. **PDF** — bloco na seção de questionários com as duas subescalas, o corte e uma frase interpretativa.
5. **Raciocínio clínico da IA** — score entra no contexto: FABQ alto reforça educação em dor, exposição gradual e metas funcionais no lugar de progressão de carga agressiva; e sinaliza no plano STEPS.

## Ideias adicionais (opcionais, para você decidir)

- **Selo "Yellow Flags" no prontuário**: quando FABQ-W ≥ 34 ou FABQ-PA ≥ 15, um badge discreto no card de hipótese alertando risco de cronificação.
- **Bateria psicossocial futura**: o mesmo domínio abre espaço para PCS (Pain Catastrophizing Scale), TSK-11 (cinesiofobia) e STarT Back — o FABQ entra como primeiro e os outros reaproveitam toda a estrutura.
- **Triagem de 2 itens como porta de entrada**: duas perguntas rápidas na anamnese ("atividade física piora minha dor" / "não deveria trabalhar com esta dor") e só oferecer o FABQ completo se pontuarem alto — reduz fadiga de preenchimento.
- **Gatilho no follow-up**: se o diário de dor mostrar aderência baixa ao HEP com dor estável, sugerir FABQ (evitação provável, não falha do exercício).

## Detalhes técnicos

- `src/data/specialtyQuestionnaires.ts`: adicionar `SpecialtyDomain = "cardio" | "geri" | "psychosocial"`, itens PT/EN do FABQ-Brasil, `scoring` retornando total por subescala + severidade e interpretação por corte. Manter o shape `SpecQScoreResult` (adicionar campo opcional `subscores`).
- `supabase/functions/suggest-specialty-questionnaires/index.ts`: espelhar a entrada no CATALOG com `triggers` psicossociais, e ler duração da dor + mecanismo de dor do `anamnesisData` (hoje o blob só usa texto livre).
- `SpecialtyQuestionnairesPanel.tsx`: ícone e cor do novo domínio, suporte a subescalas na exibição de resultado, e botão "aplicar mesmo sem sugestão".
- `PendingQuestionnaire.tsx` / `AssessmentPendingQuestionnaires.tsx`: já são agnósticos ao domínio; só validar rótulos.
- `src/lib/reassessmentSteps.ts` + `ReassessmentConfigDialog.tsx`: novo `ReassessStepId` `"psychosocial"`, fora do grupo anamnese, default desmarcado, com merge do valor anterior quando desligado.
- `src/utils/generatePdf.ts`: bloco das subescalas respeitando a margem útil de 158 mm e o guard anti-órfão de título.
- Prompts das edge functions de diagnóstico/plano/HEP: incluir FABQ quando presente.
- `Support.tsx` + `ClinicSupport.tsx` em pt/en/es na mesma entrega.
- Memória: `.agents/memory/features/fabq-psychosocial.md` com cortes e regras de gatilho.
