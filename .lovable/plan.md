# Plano — Nexo das imagens e edição estruturada do kit

## Objetivo
Tornar explícita e confiável a relação entre cada imagem e o assunto da arte, facilitar a entrega de textos prontos nos ajustes de marca e ampliar o repertório editorial da Aline Furtado Vet.

## Implementação

### 1. Garantir o nexo entre imagem e assunto
- Separar a descrição semântica da imagem de créditos e nomes de arquivo, evitando associações falsas.
- Exigir, no envio de fotos, uma descrição útil que informe **o que aparece** e **em quais assuntos pode ser usada**.
- Transformar a descrição em temas e palavras de afinidade; uma foto só será escolhida quando sustentar o tema e o texto da arte.
- Remover o fallback que usa uma foto “neutra” sem correlação: quando nenhuma imagem combina, a arte usa um formato sem foto.
- Usar a descrição também como texto alternativo da imagem.
- Cobrir com testes casos compatíveis e incompatíveis, incluindo procedimentos específicos.

### 2. Organizar “Insights de formatos” por itens
- Substituir o campo único por uma lista visual de ideias.
- Cada ideia terá campos separados para abertura, desenvolvimento e fechamento/CTA.
- Permitir adicionar e excluir ideias individualmente.
- Manter compatibilidade total com os dados já salvos e com a leitura atual do motor.

### 3. Organizar as matrizes por linhas estruturadas
- Exibir cada relação da **Matriz de palavras** como um item com campos próprios: termo, percepção, associações, públicos e tema.
- Exibir cada rota da **Matriz de raciocínio** como um item com campos próprios: público, cena/sintoma, mecanismo, prova/ponte, resultado, CTA e tema.
- Permitir adicionar e excluir linhas sem editar separadores `|` manualmente.
- Preservar o formato salvo atual para não perder nem alterar informações existentes.

### 4. Adicionar 10 ganchos à Aline Furtado Vet
- Criar um acervo curado próprio para a marca, isolado das demais.
- Variar entre coceira/lambedura, otite, nódulos/PAAF, Demodex, citologia, recorrência, prevenção e parceria com veterinários.
- Manter a regra de voz: o tutor lê e decide; sintomas, exames e condutas pertencem ao animal.
- Usar apenas soluções, provas e públicos já presentes no kit da marca.

## Validação
- Testar leitura e salvamento dos dados antigos e novos.
- Testar seleção e rejeição de imagens pelo nexo semântico.
- Confirmar exatamente 10 novos ganchos curados da Aline, sem vazamento para outras marcas.
- Validar a tela de ajustes e o acervo de fotos na prévia, em desktop e celular.
- Rodar os testes do Studio e confirmar a prévia sem erros.
