

## Corrigir scroll e navegação do Header na landing profissional

### Problemas identificados

1. **Scroll não reseta ao navegar para `/profissionais`** — não existe um componente `ScrollToTop`, então ao clicar no card da Gateway a página abre no meio.
2. **Links "Como funciona" e "Escolha sua avaliação" no Header** — apontam para `#compare` e `#how`, que são IDs de seções da PatientLanding. Na ProfessionalLanding essas seções não existem nem possuem IDs, então os links não fazem nada.

### Solução

**1. Criar `src/components/ScrollToTop.tsx`**
- Componente que usa `useLocation` + `useEffect` para fazer `window.scrollTo(0, 0)` a cada mudança de rota.

**2. Adicionar `ScrollToTop` ao `src/App.tsx`**
- Dentro do `<BrowserRouter>`, antes de `<Routes>`.

**3. Adicionar IDs às seções da ProfessionalLanding (`src/pages/ProfessionalLanding.tsx`)**
- Seção "How it works" → `id="how"`
- Seção "Pricing" → `id="compare"`

**4. Tornar o Header consciente da página (`src/components/Header.tsx`)**
- Usar `useLocation` para detectar se está em `/profissionais`.
- Na landing profissional, ajustar os labels dos links de navegação: "Como funciona" → `#how`, "Planos e preços" → `#compare` (em vez de "Escolha sua avaliação").
- Nas demais páginas, manter o comportamento atual.

### Arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `src/components/ScrollToTop.tsx` |
| Editar | `src/App.tsx` (adicionar ScrollToTop) |
| Editar | `src/pages/ProfessionalLanding.tsx` (adicionar `id="how"` e `id="compare"` nas seções) |
| Editar | `src/components/Header.tsx` (links contextuais por rota) |

