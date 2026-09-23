# Diferenciais focados e seleção múltipla no Studio

## O que será construído

1. **Seleção de vários diferenciais**
   - Transformar apenas o grupo “Diferenciais Aliv.iA” em seleção múltipla.
   - Públicos comuns e Visão 360° continuam com seleção única.
   - Ao escolher um público comum, limpar os diferenciais; ao marcar diferenciais, sair do público comum.
   - Guardar a combinação escolhida para ela permanecer ao voltar à tela.

2. **Distribuição correta da geração**
   - Quando houver vários diferenciais marcados, distribuir as artes do lote entre eles de forma equilibrada e determinística.
   - Cada arte individual fica centrada em um diferencial; um carrossel inteiro mantém o mesmo diferencial do primeiro ao último slide.
   - Salvar junto da arte qual diferencial efetivamente originou aquele conteúdo, mantendo compatibilidade com artes antigas.

3. **Foco editorial obrigatório**
   - Criar uma composição específica para diferenciais com quatro pilares: o que é, como funciona, benefício prático e prejuízo cotidiano de não ter a função.
   - Fazer título, apoio, listas, comparações, histórias, carrosséis, fechamento e legenda nascerem desses mesmos pilares.
   - Impedir que eixos genéricos da marca, termos clínicos soltos ou conteúdos de outro diferencial diluam o assunto selecionado.

4. **Validação**
   - Cobrir seleção única e múltipla, distribuição equilibrada, consistência de carrosséis, persistência e isolamento entre os doze diferenciais.
   - Conferir visualmente a seleção combinada e as artes geradas em tela móvel.

## Detalhes técnicos

- A seleção múltipla será representada por uma lista de IDs canônicos, com uma chave editorial estável usada nas sementes e na memória da geração.
- O conteúdo e a relação narrativa serão resolvidos por arte/grupo, não mesclados em um acervo único; isso evita uma frase de um diferencial completar outra.
- O registro existente de `segment` continuará aceitando um único valor; combinações serão serializadas de forma retrocompatível e reconstruídas com segurança.

## Fora de escopo

- Alterar os quatro públicos oficiais, planos, cotas ou cobrança.
- Misturar dois diferenciais na mesma arte sem uma relação editorial explicitamente definida.
- Mudar as funcionalidades clínicas comunicadas pelos doze recortes.
