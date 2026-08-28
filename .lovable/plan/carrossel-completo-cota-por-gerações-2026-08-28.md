# Carrossel completo + cota por gerações

## 1. Carrossel entregue inteiro, em scroll lateral

Hoje o motor já monta a sequência completa (capa → 2-4 slides → CTA), mas o lote de entrega sorteia artes **avulsas** da página: quase sempre cai apenas 1 slide do carrossel, e o fio de raciocínio se perde (foi exatamente o que apareceu no "04 / 05" isolado).

Mudanças:

- **Amostragem respeita o grupo**: o sorteio do lote passa a tratar cada carrossel como uma peça única — ou entra a sequência inteira, ou não entra. Nunca um slide solto.
- **Visualização em carrossel real**: os slides do mesmo grupo são exibidos em uma faixa com scroll lateral e snap (arraste no celular, setas + bolinhas no desktop), como no Instagram — em vez de virarem vários cards empilhados na lista.
- **Ações no nível do carrossel**: "PNG" exporta todos os slides numerados (`...-carrossel-01.png`, `-02`, ...), "Legenda" entrega uma legenda única da sequência, e "Salvar na marca" salva o carrossel como um item só na galeria (com capa como miniatura).
- Nada muda no roteiro nem nos 4 tratamentos visuais do carrossel.

## 2. Cota por gerações (sua leitura está certa)

Contar "artes" ficou incoerente com o produto atual. Uma geração é uma **versão** da marca: a mesma seed atravessa os públicos, a visão 360° e os 4 objetivos (informar, dor, desejo, venda) — na PerformaPro isso dá dezenas de artes navegáveis sem custo nenhum. Cobrar por arte pune quem explora bem a versão.

Modelo proposto:

- **1 geração = 1 clique em "Nova versão"** (nova seed). Trocar público, objetivo, modelo, formato, exportar e salvar continua **de graça** e ilimitado.
- Limites por período:


| Plano                 | Gerações / mês | Equivalente hoje |
| --------------------- | -------------- | ---------------- |
| Grátis                | 2              | 5 artes          |
| Solo                  | 10             | 10               |
| Marca (intermediário) | 40             | 33               |
| Agência               | 120            | 133              |
| VIP                   | ilimitado      | ilimitado        |


Ou seja: ninguém perde volume, todos ganham clareza — e o número já bate com o que a interface mostra hoje ("gerações restantes").

- **Sugestão complementar**: em vez de só bloquear ao fim da cota, o painel mostra "12 de 12 gerações neste período" com barra e aviso a partir de 80%. Se um dia fizer sentido, gerações extras podem ser vendidas em pacotes avulsos (ex.: +10) sem mexer no plano.
- Educar e informar na landing page do alivia studio publico sobre esse funcionamento e modo de operação 

## Detalhes técnicos

- `src/pages/studio/composePage.ts` + `StudioProCreate.tsx`: amostragem por grupo (carrossel indivisível) e agrupamento dos slides em uma faixa `overflow-x-auto snap-x` com controles; exportação/salvamento em lote por grupo.
- Migração SQL: `studio_plan_allowance` passa a devolver **gerações** (2/12/40/150), `consume_studio_generation` debita `1` por chamada (assinatura `p_amount` mantida por compatibilidade, mas normalizada para 1), e `studio_credit_status` devolve `allowance`/`used`/`remaining` já em gerações (`batch_size` = 1).
- `src/pages/studio-pro/plan.ts` (`PLAN_LIMITS`), `useStudioQuota.ts` e os textos de cota/planos (`StudioProCreate`, landing/preço) passam a falar só em gerações.
- Os créditos já consumidos no período são convertidos (`used / 6`, arredondando para cima) para ninguém ser cobrado duas vezes na virada.