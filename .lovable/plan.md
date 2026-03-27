

## Corrigir links personalizados dos profissionais para funcionar externamente

### Problema

O link personalizado (`/assessment/professional/:id`) é gerado usando `window.location.origin`. Quando o profissional copia esse link a partir do **preview do Lovable**, a URL gerada aponta para `id-preview--*.lovable.app`, que exige login na plataforma Lovable — tornando o link inacessível para pacientes.

### Solução

Substituir `window.location.origin` por uma constante que aponte para a URL de produção. Se o app já estiver rodando no domínio publicado, usar `window.location.origin` normalmente. Se estiver no preview, usar a URL publicada como fallback.

### Arquivos a modificar

**1. Criar helper `src/lib/getPublicOrigin.ts`**

```typescript
export const getPublicOrigin = () => {
  const origin = window.location.origin;
  // Se estiver no preview do Lovable, usar URL de produção
  if (origin.includes("id-preview--") || origin.includes("localhost")) {
    return "https://aliviawebapp.com.br"; // domínio customizado
  }
  return origin;
};
```

**2. `src/components/dashboard/ProDashboard.tsx`** (3 ocorrências)
- Importar `getPublicOrigin`
- Substituir `window.location.origin` por `getPublicOrigin()` na função `copyLink` e nos dois `<code>` que exibem o link

**3. `src/pages/ProfessionalRegister.tsx`** (2 ocorrências)
- Importar `getPublicOrigin`
- Substituir `window.location.origin` por `getPublicOrigin()` no `<Input readOnly>` e no `onClick` do botão de copiar

### Resultado

Os links copiados sempre apontarão para `https://aliviawebapp.com.br/assessment/professional/:id`, funcionando para qualquer pessoa sem necessidade de login na Lovable.

