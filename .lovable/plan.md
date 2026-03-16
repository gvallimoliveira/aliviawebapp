

## Plano: Branding — favicon, título da tab e badge Lovable

### 1. Remover badge "Made with Lovable"

Para remover o badge, o usuário precisa ativá-lo nas configurações do projeto: **Settings → Hide 'Lovable' Badge**. Isso não é controlado pelo código — é uma opção da plataforma Lovable.

### 2. Favicon — trocar para logo Aliv.iA

**`index.html`** — Adicionar tag `<link rel="icon">` apontando para o logo já existente no projeto:

```html
<link rel="icon" type="image/png" href="/src/assets/logo-alivia.png" />
```

Nota: Como Vite processa assets em `src/assets`, o ideal é copiar `logo-alivia.png` para `public/favicon.png` e referenciar `/favicon.png`. Alternativamente, pode-se converter para `.ico`.

### 3. Título da tab

**`index.html`** — Alterar a tag `<title>`:

```html
<title>Aliv.iA Webapp</title>
```

Também atualizar o `setSeo` em `Index.tsx` e demais páginas para usar "Aliv.iA Webapp" como título padrão, ou manter títulos específicos por página mas sem menções ao portal de desenvolvimento.

---

### Arquivos a editar

| Arquivo | Mudança |
|---|---|
| `index.html` | Mudar `<title>` para "Aliv.iA Webapp", adicionar `<link rel="icon">` |
| `public/favicon.png` | Copiar `logo-alivia.png` para public |
| `src/pages/Index.tsx` | Atualizar título no `setSeo` |
| `src/pages/ProfessionalLanding.tsx` | Atualizar título no `setSeo` |

