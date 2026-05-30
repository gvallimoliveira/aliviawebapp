## Objetivo
Fazer a demo do paciente abrir com percepção imediata de resposta no clique e reduzir o tempo real até a rota ficar utilizável, sem mexer em escopo além desse fluxo.

## Diagnóstico
1. **O feedback visual atual depende da própria landing permanecer montada**
   - Hoje o CTA da landing usa estado local (`isOpeningDemo` / `showDemoFallback`) em `src/pages/PatientLanding.tsx`.
   - Na prática, esse feedback some no momento em que a navegação tenta trocar a rota, então o usuário não vê uma confirmação confiável.
   - No preview, o CTA clicado continuou exibindo o texto original, sem estado visível de carregamento.

2. **O preload está acontecendo cedo demais e em uma landing já pesada**
   - A landing de pacientes ainda carrega bastante coisa antes mesmo do clique: `framer-motion`, `i18n` com 3 arquivos de locale, `VoiceRecorderProvider`, `GlobalMobileMenu`, `AuthProvider` e outros globais montados no app inteiro.
   - A medição mostrou FCP perto de **3.2s** e **129 scripts / ~1.28MB** já carregados na rota `/para-pacientes`.
   - Ou seja: o app já chega cansado antes do clique, e o preload da demo passa a competir com uma página pesada em vez de ajudar claramente.

3. **A arquitetura global do App está penalizando a landing e a demo**
   - `src/App.tsx` envolve todas as rotas com providers e componentes globais pesados, inclusive `VoiceRecorderProvider`, `RealtimeNotifier` e `GlobalMobileMenu`.
   - Isso aumenta custo de parse/exec mesmo em uma rota pública simples como `/para-pacientes`.

4. **O preload atual da demo é incompleto e pouco estratégico**
   - Hoje o aquecimento da demo depende de `import()` acionado na landing e de chunks internos da demo.
   - Falta separar claramente:
     - shell de navegação/feedback
     - conteúdo crítico above-the-fold da demo
     - conteúdo secundário das abas/modais
   - Também falta um gatilho de preload após a landing estar realmente estável, em vez de disparar quase imediatamente.

## Plano
### 1) Tornar o feedback visual persistente entre clique e troca de rota
- Remover a dependência exclusiva do estado local da landing para mostrar “Abrindo demo…”.
- Implementar um **indicador global/transitório de navegação para a demo** que sobreviva ao unmount da landing.
- Exibir imediatamente após o clique:
  - texto “Abrindo demo…”
  - barra de progresso/skeleton simples
  - fallback após ~3s: “Clique confirmado. Aguarde, a demo está carregando.”
- Manter esse estado visível até o shell da demo assumir a tela.

### 2) Mover o preload para o momento certo
- Trocar o `setTimeout(150)` atual por preload **após a landing terminar de estabilizar**.
- Priorizar uma estratégia do tipo:
  - primeiro paint / first idle da landing
  - depois aquecer apenas o chunk crítico da demo
  - só depois aquecer partes secundárias
- Evitar preload agressivo enquanto hero, animações e traduções ainda estão carregando.

### 3) Enxugar o custo da landing pública
- Reduzir o que a rota `/para-pacientes` paga antes do clique.
- Atuar cirurgicamente em pontos de maior impacto observados:
  - `VoiceRecorderProvider` global não deve pesar em rota pública
  - componentes globais que não são necessários na landing pública devem ser carregados condicionalmente
  - revisar uso de `framer-motion` no hero para evitar custo desnecessário nessa rota
  - revisar `i18n` para não puxar 3 idiomas upfront na entrada
- O objetivo é melhorar tanto a responsividade do botão quanto a velocidade da navegação posterior.

### 4) Refinar o carregamento interno da demo
- Garantir que a rota `/para-pacientes/demo` carregue primeiro só o essencial:
  - shell
  - cabeçalho
  - primeira aba visível
- Deixar mensagens, modais e blocos secundários ainda mais desacoplados.
- Revisar se há imports estáticos na demo que ainda puxam dependências cedo demais.

### 5) Validar com medição real no preview
- Re-testar no viewport móvel atual.
- Confirmar 3 resultados objetivos:
  - o clique mostra feedback imediatamente
  - a navegação efetivamente ocorre sem sensação de botão morto
  - o tempo percebido até a demo abrir cai de forma mensurável

## Detalhes técnicos
- Arquivos centrais a ajustar:
  - `src/pages/PatientLanding.tsx`
  - `src/pages/PatientDemo.tsx`
  - `src/components/demo/PatientDemoContent.tsx`
  - `src/App.tsx`
  - possivelmente `src/i18n.ts` e a montagem de providers globais
- Direção arquitetural:
  - feedback de navegação desacoplado da página de origem
  - preload em fases
  - menos custo global em rotas públicas
  - demo com chunk crítico menor

## Resultado esperado
- O usuário vê resposta visual instantânea ao tocar no CTA.
- A landing deixa de disputar tanto recurso com o preload.
- A demo abre com menor atraso real e menor sensação de travamento.