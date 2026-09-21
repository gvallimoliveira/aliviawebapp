# Matrizes de conteúdo e marca Aline Furtado Vet

## Objetivo
Transformar os itens 5 e 6 do manual em dados reais do Studio, para que o diretor e o motor criativo conectem termos técnicos, percepção do público, mecanismo, prova e ação — sem depender de IA a cada arte.

## Implementação
1. **Criar duas matrizes estruturadas por marca**
   - Matriz lexical: termo técnico, tradução/percepção humana, palavras associadas, público e tema.
   - Matriz de raciocínio: cena/sintoma → mecanismo → prova ou ponte → consequência/desejo → CTA.
   - Manter compatibilidade com palavras-chave e insights atuais; marcas sem matriz continuam funcionando normalmente.

2. **Ligar as matrizes ao motor e ao diretor criativo**
   - A matriz lexical reforça vocabulário, títulos, argumentos e afinidade temática.
   - A matriz de raciocínio cria rotas narrativas completas antes da redação, sem misturar públicos.
   - Seleção determinística por marca, público, objetivo e semente; mesma geração continua produzindo a mesma arte.
   - Preservar memória antirrepetição, filtro de sentido, revisão linguística e públicos apenas manuais.

3. **Adicionar edição no kit de marca**
   - Nova etapa em Ajustes para revisar e editar pares lexicais e sequências de raciocínio.
   - Campos claros, sem exigir conhecimento técnico do usuário.

4. **Preencher as marcas atuais**
   - **Aliv.iA:** matrizes por Paciente, Profissional, Clínica, Estudante e Recém-formado, conectadas a D.I.F.I., STEPS, avaliação, prontuário, indicadores, HEP e segurança.
   - **Guilherme Vallim Fisioterapia:** matrizes coerentes com cada público clínico existente; feridas permanece fora da geração automática e só entra por seleção manual.

5. **Criar Aline Furtado Vet completa**
   - Cadastrar a marca no perfil admin com posicionamento, voz, limites, paleta, tipografia, slogan, três públicos, palavras-chave, cenas, dores, desejos, objeções, consequências, provas e CTAs.
   - Inserir os quatro esqueletos do manual e repertório lexical técnico + linguagem percebida pelo tutor.
   - Usar o monograma do manual se for possível extraí-lo com qualidade; caso contrário, manter o campo visual sem inventar outra logo.

## Validação
- Testes de leitura, gravação, escopo por público, determinismo e composição narrativa.
- Testar geração das três marcas e confirmar que título, apoio e corpo pertencem ao mesmo raciocínio.
- Conferir contraste, tipografia, assinatura e exportação da Aline Furtado Vet na prévia.
- Validar compilação e registrar a entrega no roteiro do projeto.

## Detalhes técnicos
- Novas colunas JSON estruturadas na tabela de marcas, com valores vazios por padrão e sem quebrar registros existentes.
- Parsers tolerantes e tipos próprios no frontend.
- Integração nos pontos únicos que constroem a relação narrativa e planejam o lote.
- Nenhuma chamada adicional de IA por arte e nenhum consumo extra de créditos na geração normal.
