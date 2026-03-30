

## Correções de SEO e Descoberta

### Status atual

1. **`robots.txt`** — Não tem referência ao sitemap (a edge function `/sitemap` existe e funciona)
2. **JSON-LD** — Só existe `WebApplication` na landing legacy. Faltam `Organization`, `MedicalBusiness` e `FAQPage`
3. **`theme-color`** — Já existe no `index.html` (linha 37: `#3a9e8e`). Nenhuma ação necessária.

### Alterações

#### 1. `public/robots.txt` — Adicionar referência ao sitemap
Adicionar ao final:
```
Sitemap: https://vjrtsqgnoeehviypkqrf.supabase.co/functions/v1/sitemap
```

#### 2. `src/lib/seo.ts` — Adicionar 3 novas funções JSON-LD

- **`setOrganizationJsonLd()`** — Schema `Organization` com nome, URL, logo, sameAs (redes sociais)
- **`setMedicalBusinessJsonLd()`** — Schema `MedicalBusiness` com tipo de serviço, área de atuação, descrição
- **`setFAQPageJsonLd(faqs)`** — Schema `FAQPage` que recebe array de {question, answer} e gera o markup correto

#### 3. `src/pages/LandingLegacy.tsx` — Injetar Organization + MedicalBusiness + FAQPage
No `useEffect`, chamar `setOrganizationJsonLd()` e `setMedicalBusinessJsonLd()` junto ao `setLandingJsonLd()` existente.

#### 4. `src/pages/PatientLanding.tsx` — Injetar Organization + FAQPage
Mesmo padrão: chamar os novos helpers no `useEffect`.

#### 5. `src/components/FaqSection.tsx` — Injetar FAQPage JSON-LD
Usar as chaves de tradução para montar o array de FAQs e chamar `setFAQPageJsonLd()` dentro de um `useEffect`, garantindo que o schema é injetado quando o componente renderiza.

### Detalhes técnicos

| Arquivo | Ação |
|---|---|
| `public/robots.txt` | Adicionar linha `Sitemap:` |
| `src/lib/seo.ts` | 3 novas funções exportadas |
| `src/pages/LandingLegacy.tsx` | Importar e chamar Organization + MedicalBusiness |
| `src/pages/PatientLanding.tsx` | Importar e chamar Organization |
| `src/components/FaqSection.tsx` | Importar e chamar FAQPage com dados traduzidos |

