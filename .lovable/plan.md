# Tornar a edição de texto integral e à prova de recarregamento

## Resultado
- Nenhum texto ajustado muda ou volta ao original após concluir, salvar, baixar ou atualizar a tela.
- Todo texto de conteúdo da arte poderá ser selecionado e editado, preservando logo e elementos apenas decorativos.
- Substituições de vocabulário serão aprendidas como preferências reutilizáveis, inclusive em frases diferentes.

## Implementação
- Guardar imediatamente um rascunho local da arte durante a digitação, identificado pela marca, geração e arte; reaplicá-lo antes de qualquer nova renderização e limpar somente ao desfazer ou trocar de geração.
- Estabilizar a remontagem após “Concluir ajuste”, preservando texto, tamanho, posição e destaques sem permitir que uma atualização do diretor criativo recalcule aquela arte.
- Ampliar a identificação dos textos editáveis para elementos visuais de texto além de títulos e parágrafos, agrupando fragmentos da mesma frase e excluindo assinatura, ícones, números decorativos e controles.
- Evoluir o aprendizado de frases completas para também extrair substituições recorrentes de palavras e expressões, com prioridade para a forma escolhida pelo usuário nas próximas gerações.
- Registrar desde já as preferências “prazo” → “tempo” e “execução medida” → “execução baseada em métricas” para a marca ativa.
- Adicionar testes para recarregamento, edição de todos os tipos de texto, preservação visual e aplicação de vocabulário em frases novas.

## Validação
- Testar editar → concluir → salvar → recarregar e editar → baixar em arte avulsa e carrossel.
- Confirmar visualmente no celular que todas as frases esperadas recebem área editável e que nenhuma alteração desaparece.
