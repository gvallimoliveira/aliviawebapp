# Corrigir o atraso percebido da landing profissional

## Diagnóstico confirmado

- A landing profissional não é a mais pesada na medição direta: exibiu o primeiro conteúdo em aproximadamente **584 ms**, antes da landing do paciente no mesmo ambiente.
- O atraso percebido acontece principalmente na navegação interna:
  1. `App.tsx` carrega `ProfessionalLanding.tsx` de forma lazy;
  2. esse arquivo inicia um segundo lazy para `ProfessionalLandingCinematic.tsx`;
  3. ao montar, o hero começa com `opacity: 0` e animações escalonadas.
- No teste de clique, a URL mudou em cerca de **183 ms**, mas o título profissional ainda estava invisível perto de **500 ms** e só ficou estável por volta de **1,4 s**.
- O fallback interno atual é apenas um fundo vazio, portanto o intervalo parece uma página travada.
- A tela de abertura global de 2,6 s também cobre qualquer acesso direto “frio”, mas não é exclusiva de `/profissionais`; ela será preservada neste ajuste para não ampliar o escopo.

## Plano de implementação

1. **Remover o carregamento lazy em cascata**
   - Fazer `App.tsx` importar diretamente a variante ativa da landing profissional.
   - Manter o layout clássico preservado e selecionável pelo mesmo controle existente.
   - Eliminar o chunk intermediário que hoje apenas decide entre cinematic e classic.

2. **Pré-aquecer a rota profissional antes do clique**
   - Centralizar o import da landing em uma função reutilizável.
   - Iniciar o download por intenção (`pointerenter`, foco ou toque) nos acessos principais da página geral e do cabeçalho.
   - Na página geral, aproveitar tempo ocioso após o primeiro paint para deixar a landing pronta sem competir com a exibição inicial.

3. **Exibir o primeiro viewport imediatamente**
   - Não iniciar título, texto e CTAs essenciais com opacidade zero.
   - Preservar movimento sutil de entrada sem bloquear a leitura nem atrasar a percepção de conclusão.
   - Manter as animações cinematográficas das seções abaixo da dobra.

4. **Criar uma transição visual útil para acesso direto lento**
   - Substituir o fundo vazio do Suspense por um skeleton leve do cabeçalho e hero profissional.
   - Evitar sobreposição com o indicador global e impedir qualquer flash branco.

5. **Adiar apenas conteúdo abaixo da dobra**
   - Separar blocos pesados que não participam do primeiro viewport, especialmente tabela de questionários, FAQ e componentes finais.
   - Carregá-los quando estiverem próximos da viewport, mantendo SEO e navegação por âncoras funcionais.

## Validação

- Medir navegação real da página geral e da landing do paciente para `/profissionais`, em desktop e no viewport móvel atual.
- Confirmar que o hero profissional já está legível no primeiro frame da nova rota, sem estado inicial `opacity: 0`.
- Comparar waterfall antes/depois e confirmar a remoção do chunk intermediário serial.
- Testar acesso direto com cache vazio, navegação com cache aquecido, voltar/avançar e preferência de movimento reduzido.
- Verificar build, console e erros de runtime; preservar login, links, preços, idiomas e alternância entre layouts clássico/cinematográfico.

## Critério de sucesso

Após o clique, a nova tela deve dar retorno visual imediato e apresentar o hero legível em até aproximadamente **300–500 ms em ambiente local**, sem o intervalo atual de cerca de **1,4 s** até a estabilização visual.
