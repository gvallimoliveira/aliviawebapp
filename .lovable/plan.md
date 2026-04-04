# Disclaimer sobre Cadeias Cinéticas e Separação de Avaliações

## O que será feito

### 1. Disclaimer na etapa de Queixa Principal (Anamnese)

Adicionar um bloco informativo (Alert com ícone de info) logo abaixo do subtítulo "Selecione uma ou mais regiões relacionadas", antes do grid de botões, explicando:

- O sistema analisa cadeias cinéticas de estruturas relacionadas
- Combinações de regiões do mesmo segmento são permitidas porque estão biomecanicamente conectadas
- Se não for possível selecionar uma combinação (ex: pé + cervical), é porque o ideal é separar em 2 avaliações distintas para melhor precisão

Também melhorar a mensagem de conflito existente (`complaint_group_conflict`) para reforçar essa explicação.

### 2. Nova FAQ na Landing Page do Paciente e no suporte do paciente 

Adicionar uma FAQ 7: "Por que não consigo selecionar todas as regiões que quero?" com resposta explicando o raciocínio de cadeias cinéticas e a recomendação de avaliações separadas.

Atualizar `faqKeys` no `FaqSection.tsx` para incluir `faq7`.

### 3. Traduções (pt/en/es)

Adicionar chaves:

- `anamnesis.kinetic_chain_disclaimer` — texto do disclaimer na anamnese
- `anamnesis.complaint_group_conflict` — reescrever com mais contexto
- `faq.faq7.q` / `faq.faq7.a` — nova FAQ

## Arquivos a alterar

1. `**src/locales/pt.json**`, `**en.json**`, `**es.json**` — novas chaves + reescrita do conflito
2. `**src/components/assessment/AnamnesisForm.tsx**` — inserir Alert informativo na etapa complaint
3. `**src/components/FaqSection.tsx**` — adicionar `faq7` ao array de keys