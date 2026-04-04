

# Posicionar HEP, White-label e Reavaliação Expressa como argumentos de venda

## Análise de impacto (perspectiva do fisioterapeuta)

Reorganizando por relevância para o profissional:

1. **Economia de tempo / Eficiência clínica** (já existe) — argumento #1 universal
2. **Reavaliação Expressa** (NOVO, alto impacto) — demonstra continuidade do cuidado, agiliza retornos, é diferencial competitivo direto
3. **Programa de Exercícios (HEP)** (NOVO, alto impacto) — prescrição digital com vídeos é desejo constante do fisioterapeuta, substitui papel/WhatsApp informal
4. **White-label / Marca própria** (NOVO, impacto médio-alto) — profissionalismo percebido, diferencial para clínicas
5. **Avaliações assertivas com dados estruturados** (já existe)
6. **Questionários + Relatórios PDF** (já existe)
7. **Dashboard de Métricas Evolutivas** (já existe)

## Mudanças na Landing Page Profissional

### Seção Benefits (grid 2x3 em vez de 2x2)
Reordenar e expandir de 4 para 6 cards:
1. Economize tempo (mantém)
2. **Reavaliação Expressa** (NOVO) — ícone RefreshCw — "Reavalie com 1 clique. Dados pré-preenchidos, sem retrabalho."
3. **Programa de Exercícios (HEP)** (NOVO) — ícone Dumbbell — "Prescreva exercícios com vídeo e envie via link. Sem papel, sem confusão."
4. Avaliações assertivas (mantém)
5. **Sua marca nos relatórios** (NOVO, substitui o antigo benefit_3 de questionários) — ícone Palette — "Logo e identidade visual nos PDFs e na tela de avaliação do paciente."
6. Dashboard evolutivo (mantém)

### Seção Features ("O que você recebe no painel")
Expandir de 6 para 9 itens, incluindo:
- Reavaliação expressa com pré-preenchimento
- Programa de exercícios com banco de 70+ exercícios e vídeos
- Relatórios PDF com sua marca (white-label)

### Seção Pricing (includes)
Adicionar às listas de ambos os planos:
- Programa de Exercícios com vídeos
- Reavaliação expressa
- Relatórios com sua marca

### Seção FAQ
Adicionar 2 FAQs:
- "Como funciona o Programa de Exercícios?" → Explica banco de 70+ exercícios, vídeos, link público, validade 90 dias
- "Posso usar minha marca nos relatórios?" → Explica upload de logo e white-label

## Mudanças na Página de Suporte

### Pro Tools (accordion)
Adicionar 3 novas entradas ao array `proTools`:
- `{ key: "hep", icon: Dumbbell }` — "Programa de Exercícios (HEP)"
- `{ key: "reassessment", icon: RefreshCw }` — "Reavaliação Expressa"
- `{ key: "white_label", icon: Palette }` — "Marca nos Relatórios (White-label)"

Com descrições detalhadas de como usar cada funcionalidade.

## Arquivos a alterar

1. **`src/locales/pt.json`**, **`en.json`**, **`es.json`** — novas chaves b2b.benefit_5/6, b2b.feature_7/8/9, b2b.pricing_inc_6/7/8, b2b.faq4/5, support.pro.tool.hep/reassessment/white_label
2. **`src/pages/ProfessionalLanding.tsx`** — expandir arrays benefits (6 items, grid 2x3), features (9 items), pricingIncludes (8 items), faqKeys (5 items); importar novos ícones
3. **`src/pages/Support.tsx`** — adicionar 3 entradas ao `proTools` array; importar ícones Dumbbell, Palette

## Detalhes técnicos

- Grid de benefits muda de `grid-cols-1 sm:grid-cols-2` para `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Features grid já é 3 colunas, apenas adicionar 3 items
- Nenhuma mudança de DB ou lógica — apenas conteúdo e layout

