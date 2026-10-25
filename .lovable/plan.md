# Serviço obrigatório na solicitação de agendamento

Hoje o paciente já vê um seletor de serviço, mas ele é opcional ("nenhum") e some quando não há serviços cadastrados. O ajuste torna o serviço uma escolha dirigida.

## O que muda para o paciente
- O seletor "Serviço" sempre aparece, listando só os serviços ativos do profissional ou da clínica escolhida.
- Escolha obrigatória: o botão de enviar fica desabilitado até selecionar um serviço. A opção "nenhum" deixa de existir.
- Se houver um único serviço, ele já vem selecionado.
- Se o profissional/clínica não tiver serviços cadastrados, o seletor mostra "Nenhum serviço disponível" e a solicitação segue sem serviço (para não bloquear quem ainda não configurou o catálogo).
- O aviso "será analisado e poderá ser confirmado ou reagendado" permanece.

## O que muda para a equipe
- Na aprovação, o serviço solicitado continua chegando pré-selecionado (pode ser trocado).

## Detalhes técnicos
- `PatientAppointmentsTab.tsx`: remover item "none", estado inicial vazio, auto-seleção quando `services.length === 1`, validação antes do envio, estado vazio quando não há serviços.
- Nova migração substituindo `create_appointment_request_v2`: se o provedor tiver serviços ativos, `_service_id` passa a ser obrigatório (`RAISE EXCEPTION 'service required'`); validação de pertencimento mantida.
- Mensagem de erro amigável para "service required".
