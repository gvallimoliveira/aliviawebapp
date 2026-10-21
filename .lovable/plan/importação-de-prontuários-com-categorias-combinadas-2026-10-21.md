# Importação de prontuários com categorias combinadas

## Objetivo
Permitir importar cadastro, avaliações e evoluções presentes no mesmo arquivo, sem exigir um modelo específico do FisioSoft e sem alterar o caminho atual de arquivos com uma categoria.

A solução será um **modo de importação combinada com conferência**, não uma promessa de compatibilidade universal.

## Formatos cobertos
- **Uma linha por atendimento:** cadastro repetido junto à avaliação ou evolução; consolidar o cadastro e manter os atendimentos separados.
- **Uma linha por paciente com blocos de colunas:** por exemplo, `avaliação_data`, `avaliação_queixa`, `evolução_1_data`, `evolução_1_texto`, `evolução_2_data`, `evolução_2_texto`.
- **Linhas com categoria indicada:** coluna com “paciente”, “avaliação” ou “evolução”, com correspondência de valores revisável.
- **Arquivos separados:** manter o fluxo existente e permitir conferir a identificação compartilhada entre arquivos.

## Experiência de conferência
1. Oferecer “Categorias combinadas” além das categorias atuais.
2. Sugerir correspondências por nomes de colunas e padrões conhecidos; permitir corrigir categoria, campo e número do bloco. Colunas desconhecidas continuam disponíveis para mapeamento manual.
3. Mostrar o resultado separado em pacientes, avaliações e evoluções, com quantidades e referência à linha/bloco de origem.
4. Apontar datas ausentes, identificações conflitantes, campos sem destino e registros sem paciente antes de gravar.
5. Exigir decisão explícita sobre campos não classificados: preservar como informação externa ou ignorar. Não descartar silenciosamente.
6. Confirmar e importar cadastros antes do histórico; apresentar os registros efetivamente importados, pendências e opção de desfazer.

## Regras de segurança e fidelidade
- Nunca inventar e-mail, CPF, data, avaliação, evolução ou informação clínica.
- Células vazias não geram registros; múltiplas evoluções não são concatenadas como se fossem um atendimento.
- Cadastro repetido é consolidado somente quando a identidade é inequívoca. Homônimos e identificadores conflitantes exigem revisão.
- Códigos de paciente do sistema de origem servem apenas para relacionar registros dentro da importação e do escopo autorizado; nunca concedem acesso ou substituem os identificadores internos.
- Preservar texto clínico, datas fornecidas e colunas extras escolhidas. Não interpretar histórico importado como nova triagem de segurança nem como raciocínio clínico gerado pelo Aliv.iA.
- Texto livre com vários atendimentos sem datas ou separadores confiáveis permanece como informação externa para revisão; não criar uma cronologia fictícia.
- Registros pendentes ficam fora da gravação, com contagens claras; importar apenas a parte válida exige confirmação explícita.
- Manter autorização e isolamento entre clínicas, registro de alterações e proteção do desfazer contra edições posteriores.

## Histórico extenso
O limite atual de 5.000 linhas por tabela não deve exigir divisão manual: preparar o arquivo e enviar lotes menores, com progresso e relatório consolidado. Dimensionar os lotes também pelo tamanho do conteúdo, não apenas pelo número de linhas, para evitar tempo excedido.

Manter inicialmente os 20 MB por arquivo e estabelecer limites explícitos para registros gerados e memória. Aumentar o limite do arquivo dependerá de medições, não de estimativas sobre quantos anos “cabem”. Recomeçar após uma falha não pode duplicar silenciosamente registros já concluídos.

## Detalhes técnicos
- Criar um transformador determinístico separado do importador atual, com configuração de layout e mapeamento por categoria/bloco.
- Usar essa configuração para produzir tabelas nativas e um relatório de validação antes da primeira escrita. Sugestões não decidem vínculos clínicos automaticamente.
- Revisar o vínculo real das evoluções: hoje ele exige e-mail. Suportar pacientes sem e-mail somente após garantir identificação e leitura corretas no prontuário; não usar e-mail fictício como atalho.
- Validar configuração, campos e vínculos também no servidor; preservar o caminho service-only de escrita e desfazer. Qualquer mudança necessária de estrutura será aditiva.
- Consolidar os identificadores de todos os lotes para desfazer a operação inteira com as proteções existentes. Não prometer transação única entre chamadas separadas; falhas parciais devem ficar explícitas.
- Atualizar ajuda do profissional e da clínica em português, inglês e espanhol.

## Testes e aceite
- Exemplos fictícios de todos os layouts acima, incluindo duas avaliações e três evoluções de um mesmo paciente.
- Cadastro repetido, homônimos, CPF/e-mail conflitantes, códigos externos e paciente sem e-mail.
- Datas ausentes ou inválidas, campos desconhecidos, blocos vazios e texto com ponto e vírgula, aspas e quebras de linha.
- Arquivo acima de 5.000 linhas, falha entre lotes, reenvio e desfazer com edição posterior.
- Regressões dos arquivos atuais CSV, XML, JSON e ZIP do Aliv.iA.
- Conferir importação, leitura no prontuário e desfazer com dados fictícios em conta autorizada; não alterar pacientes reais.

## Fora do escopo
Anexos, PDFs, imagens, dados financeiros e reconstrução automática de histórico em texto livre. Exportações com estrutura não reconhecida exigirão mapeamento ou adaptação após conhecer uma amostra.
