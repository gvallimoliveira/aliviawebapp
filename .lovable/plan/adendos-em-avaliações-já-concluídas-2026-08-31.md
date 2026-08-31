# Adendos em avaliações já concluídas

## O que você terá

1. **Adendo manual no app** — no prontuário, dentro da avaliação aberta, botão "Adicionar informações". Abre um campo de texto (com data e autor) e salva como adendo vinculado àquela avaliação.
2. **Link de adendo para o paciente** — botão "Pedir mais informações ao paciente" gera um link curto exclusivo daquela avaliação. A página abre com o aviso "Estas informações serão adicionadas à sua avaliação de dd/mm", um único campo de texto livre e envio. Não pede login e não refaz nada do que já foi respondido.
3. **Aviso no prontuário** — quando um adendo chega (seu ou do paciente), a avaliação mostra um selo "Novas informações" e um bloco **Informações adicionais** com a lista de adendos (data, quem escreveu, conteúdo completo).
4. **Botão "Reinterpretar avaliação"** — dentro desse bloco. Só ao clicar a IA reprocessa a avaliação original + adendos e atualiza o que for necessário (hipótese, resumo/raciocínio, impressão clínica). Se você achar o adendo irrelevante, não clica: nada é gasto e os adendos ficam registrados no bloco.

## Comportamento da reinterpretação

- Confirmação antes de rodar,  nao precisa avisar que consome créditos de IA.
- A hipótese anterior é preservada; a nova fica marcada como versão atualizada, com data e a observação de que foi reinterpretada após adendo.
- A impressão clínica é regenerada junto (usa a mesma marcação de "precisa reprocessar" que já existe hoje).
- Adendos já considerados ficam marcados como "incluídos na interpretação"; um novo adendo reativa o botão.
- Override manual de hipótese feito por você continua tendo prioridade sobre a saída da IA.
- Adendos e a reinterpretação aparecem no PDF (bloco de informações adicionais + nota de que a hipótese foi revisada).

## Detalhes técnicos

- Nova tabela `assessment_addenda`: `assessment_id`, `content`, `author_type` (professional | patient), `author_user_id`, `token`, `status` (pending | submitted), `considered_at`, timestamps. GRANTs para `authenticated`/`service_role`; RLS: profissional/clínica vinculada à avaliação lê e escreve; escrita pelo paciente só via edge function com token (service role).
- Edge function `assessment-addendum` com ações `load` (valida token, devolve data da avaliação e nome do profissional) e `submit` (grava adendo, marca `assessments.needs_reimpression`, dispara notificação/push ao profissional). Mesmo padrão de `submit-pending-questionnaire`.
- Rota pública `/adendo/:token` (`src/pages/AssessmentAddendum.tsx`), link curto via `src/lib/shortLink.ts`.
- Prontuário: novo componente `AssessmentAddendaCard.tsx` em `src/components/dashboard/patient-evolution/`, renderizado na avaliação aberta (`PatientDetailView.tsx`) e listado no rail de seções.
- Reinterpretação: chama `generate-diagnosis` com `anamnesisData`, `test_results`, adendos e a hipótese atual; grava `diagnosis` novo guardando o anterior em `diagnosis.previousVersions[]`, e seta `needs_reimpression = true` para a impressão clínica se regenerar (fluxo já existente em `shared.tsx`).
- Gasto de crédito só no clique do botão (fluxo normal de créditos das funções de IA).
- PDF: incluir seção "Informações adicionais" no gerador de relatório da avaliação.
- Support.tsx + ClinicSupport.tsx (pt/en/es) atualizados na mesma entrega.

## Verificação

- Teste do fluxo: adendo manual, adendo por link, aviso no prontuário, reinterpretação com preservação da hipótese anterior e caso "não reinterpretar".
- Conferir aparição no PDF e chegada da notificação ao profissional.