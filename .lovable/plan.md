# Exportar conversa do Agente Clínico em PDF

Botão **PDF** ao lado esquerdo da lixeira, em cada conversa da barra lateral do Agente Clínico. Gera um PDF compacto no layout Aliv.iA com a transcrição fiel do chat.

## Comportamento

- Cada linha de conversa passa a ter dois botões: `PDF` e a lixeira (mesma altura/estilo, lixeira segue à direita).
- Ao clicar em PDF: baixa a conversa daquela thread, monta o documento e faz download com nome tipo `AliviA_Conversa_<titulo>_<data>.pdf`. Spinner no botão enquanto gera; toast de sucesso/erro.
- Funciona para qualquer conversa da lista, inclusive a que não está aberta.

## Layout do PDF (2 colunas compactas)

- Cabeçalho padrão Aliv.iA: logo/marca, título "Registro de Conversa — Agente de Raciocínio Clínico", nome do profissional, paciente vinculado (quando houver), data de criação da conversa e data de emissão.
- Corpo em **2 colunas** dentro da largura útil de 158 mm, fonte reduzida, leitura contínua: enche a coluna esquerda, depois a direita, depois nova página.
- Cada mensagem como bloco compacto com etiqueta de autor ("Você" / "Aliv.iA") e horário, fundo levemente tonalizado para o agente e borda simples para o profissional — mesma dinâmica visual do chat, sem bolhas grandes.
- Blocos longos podem quebrar entre colunas/páginas, mas a etiqueta do autor nunca fica separada do início do texto.
- Ao final: seção **Referências científicas** consolidando as citações usadas na conversa (título, autores, ano, PEDro/DOI/PMID quando disponíveis), sem duplicatas.
- Rodapé com paginação e a nota de que o conteúdo é apoio ao raciocínio clínico, não prescrição automática.

## Detalhes técnicos

- Nova função `generateAgentChatPdfBlob()` em `src/utils/generatePdf.ts`, reutilizando `createPdfDoc()`, `MARGIN`/`SECTION_TEXT_W`, `drawRoundedRect`, `drawBrandLogo` e as cores existentes, mais um pequeno motor de fluxo de 2 colunas (cursor por coluna com `splitTextToSize` na largura da coluna).
- Em `src/pages/ClinicalAgent.tsx`: `ThreadRow` recebe `onExportPdf` e um estado de loading; grid passa de `[1fr_2.75rem]` para `[1fr_2.75rem_2.75rem]`.
- Busca das mensagens por `agent_messages` filtrando `thread_id` (mesma consulta já usada ao abrir a conversa), extraindo texto de `parts` e as `citations`.
- Sem mudanças de banco, de edge function ou de RLS. Quizzes e anexos ficam de fora desta versão (só as mensagens e referências).

## QA

Gerar PDFs de uma conversa curta e de uma longa (com citações), converter as páginas em imagem e inspecionar: alinhamento das 2 colunas, nenhum texto cortado, nenhum rótulo órfão, tamanho de arquivo reduzido.
