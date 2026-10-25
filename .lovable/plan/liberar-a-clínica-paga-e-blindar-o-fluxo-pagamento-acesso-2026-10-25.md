# Liberar a clínica paga e blindar o fluxo pagamento → acesso

## O que foi confirmado
- O pagamento anual (Clinic até 3 membros) de integrallitefisiopilates@gmail.com está ativo no gateway.
- Não existe nenhuma clínica criada para esse usuário no banco. Por isso o painel admin não mostra a clínica e o Dashboard volta para a tela de planos.
- A clínica só é criada pelo aviso automático do gateway (webhook). A verificação feita ao voltar do pagamento apenas lê clínicas já existentes — se o aviso falha, ninguém cria a clínica.

## 1. Liberar o acesso agora
- Criar a clínica para esse usuário como dona, com status ativo, ID do cliente e da assinatura do gateway, plano e limite de 3 membros, e registrá-la como membro dono ativo.
- Nome: o informado no checkout (lido dos dados da sessão de pagamento); se vazio, "Minha Clínica" (editável depois).
- Registrar a ação no histórico administrativo de assinaturas.

## 2. Corrigir na raiz (autocorreção)
- A verificação pós-pagamento da clínica passa a, quando não houver clínica, procurar no gateway uma assinatura de clínica ativa/em teste para o e-mail do usuário e criar a clínica + membro dono na hora (mesma lógica do webhook, de forma idempotente — nunca duplica).
- Fazer webhook e verificação usarem uma única rotina compartilhada de criação, evitando divergência.
- Tela de retorno do pagamento: tentar a verificação algumas vezes com mensagem "Liberando seu acesso…", e só então entrar no Dashboard da clínica; se falhar, mostrar botão "Tentar novamente" e contato, nunca prender na tela de planos.

## 3. Aviso do gateway (webhook)
- Conferir nos registros do webhook por que o evento desta compra não criou a clínica (assinatura inválida do segredo ou erro na criação).
- Se for o segredo: pedir que você cole o segredo correto do endpoint (formulário seguro), com o passo a passo de onde copiá-lo no gateway.
- Erros do webhook passam a gerar alerta no painel admin.

## 4. Validação ponta a ponta
- Entrar como o usuário e confirmar: Dashboard abre a clínica, painel admin lista a clínica ativa.
- Simular o caso "aviso falhou" e confirmar que a autocorreção cria a clínica uma única vez.
- Teste automático da regra: assinatura de clínica ativa sem clínica ⇒ cria; já existe ⇒ não duplica.

## Pendência possível
- Se o segredo do webhook estiver errado, depende de você colar o valor correto.
