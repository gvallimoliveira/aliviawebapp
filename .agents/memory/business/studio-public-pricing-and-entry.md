---
name: Studio público — preços e acesso interno futuro
description: Planos do Aliv.iA Studio público (39/99/249 + anual −20%), custo por arte e decisão sobre entrada interna via Aliv.iA fisio
type: business
---

## Preços (decididos em 26/08/2026)
- Solo R$39/mês — 1 marca, 60 artes.
- Marca R$99/mês — 3 marcas, 200 artes (plano destacado).
- Agência R$249/mês — 15 marcas, 800 artes.
- Plano anual com 20% de desconto (`PRODUCT.annualDiscount`, helper `annualMonthlyPrice`).
- 5 artes gratuitas no cadastro, com marca d'água discreta.

## Custo por arte
A geração é 100% client-side (composição determinística + html-to-image): **0 crédito de IA por arte**.
Se no futuro entrar legenda por LLM ou imagem gerada por IA, estimar ~1 crédito por imagem gerada e fração
de crédito por legenda. As 5 artes grátis permanecem viáveis em qualquer cenário.

## Acesso interno (FUTURO — não implementar sem pedido)
O Studio será vendido também para fisios, estudantes, clínicas, pacientes e empresas.
Quando implementado:
- Item no menu lateral do Aliv.iA (fisio) levando ao Studio público com marcador de origem (`?from=alivia`, persistido na sessão).
- Nesse caminho interno, exibir botão "Voltar ao Aliv.iA".
- Quem entra pela home do Studio (`/studio-pro`) **nunca** vê esse botão nem qualquer link clínico.
