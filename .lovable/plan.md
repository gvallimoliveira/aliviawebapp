# Solução estrutural: margens móveis e exportação fiel de carrosséis

## Diagnóstico confirmado no preview

- **Margens:** em 440 px, o contêiner útil mede 366 px, mas cada card de “Minhas marcas” cresce para cerca de 447 px. A causa é a coluna automática do CSS Grid, que preserva a largura mínima do conteúdo. `overflow-x-hidden` apenas esconde a parte excedente; não corrige o tamanho real do card.
- **Carrosséis:** a exportação ainda rasteriza os elementos vivos da página. Eles estão dentro de faixa rolável, `AutoFit`, animações ligadas ao scroll e alturas que mudam durante carregamento. Congelar apenas a camada animada não torna esse DOM uma superfície de exportação determinística.

## Nova abordagem

### 1. Corrigir a largura na origem

- Definir a grade móvel de marcas com coluna explícita `minmax(0, 1fr)`.
- Tornar card, link e bloco textual realmente encolhíveis (`min-width: 0`, largura máxima de 100%) e manter ícones como elementos fixos.
- Aplicar a mesma regra estrutural aos cards e formulários de “Ajustes da marca”, sem usar recorte como solução.
- Validar em 320, 375 e 440 px conferindo que cada borda direita permanece dentro do viewport.

### 2. Parar de capturar a arte visível na página

Criar uma **superfície estática de exportação fora da tela**:

1. Clonar cada quadro para uma área isolada anexada ao documento, fora do viewport.
2. Copiar para a cópia os tokens da marca e as dimensões do formato.
3. Neutralizar animações na cópia, que não terá Framer Motion atualizando estilos enquanto o PNG é criado.
4. Carregar fontes e imagens dentro dessa superfície e aguardar a estabilização do layout.
5. Medir a cópia já estática pelo conteúdo real, e só então definir as dimensões finais.
6. Rasterizar a cópia e descartá-la ao terminar, sem alterar a arte que o usuário vê.

Assim, scroll, posição na página, faixa horizontal e animação deixam de influenciar o arquivo.

### 3. Formato Livre com quadro único por carrossel

- Preparar todas as cópias primeiro.
- Medir a altura natural de cada uma após fontes/imagens estarem prontas.
- Adotar a maior altura como dimensão final de todos os slides, usando-a como quadro mínimo, não como corte rígido.
- Verificar antes da rasterização se algum conteúdo excede o quadro; se exceder, ampliar o lote e recalcular todos os slides.

### 4. Unificar criação, salvamento e galeria

- Fazer PNG individual, PNG em lote e salvamento usarem a mesma superfície estática.
- Guardar no snapshot exatamente as dimensões efetivamente exportadas.
- Na galeria, para carrosséis que possuem snapshot, reconstruir os PNGs pela superfície estática no momento do download. Isso permite corrigir também carrosséis já salvos cujo arquivo antigo ficou parcial; artes antigas sem snapshot continuam usando o PNG armazenado.

### 5. Provas antes de concluir

- Teste unitário da grade garantindo track `minmax(0, 1fr)` e nós encolhíveis.
- Testes do exportador garantindo que o clone não herda transformações de movimento, preserva `AutoFit` e produz dimensões iguais em todo o carrossel Livre.
- Teste real no preview móvel e desktop: baixar um carrossel de 5 slides da criação e o mesmo carrossel pela galeria; abrir e comparar cada PNG com a arte exibida.
