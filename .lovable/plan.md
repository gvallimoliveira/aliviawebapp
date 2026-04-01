

## Ajustes no Header: Suporte Público + Âncoras Mobile

### Problema 1 — Link de Suporte só aparece para usuários logados

No desktop (linha 62-66) e mobile (linha 152-158), o link de suporte está dentro de blocos condicionais `{user && ...}` ou `{user ? ...}`. Como a página de suporte agora é pública, o link precisa aparecer sempre.

### Problema 2 — Âncoras do menu mobile não funcionam

A função `go(path)` usa `navigate(path)` do React Router. Para hash links como `#compare` e `#how`, `navigate("#compare")` não faz scroll — ele tenta mudar de rota. Na landing de pacientes funciona por acaso (o componente já está na mesma página), mas na profissional falha porque o Router não resolve a âncora.

**Correção**: Quando o path começa com `#`, usar `document.querySelector(path)?.scrollIntoView({ behavior: "smooth" })` em vez de `navigate()`.

### Alterações em `src/components/Header.tsx`

1. **Função `go`**: Detectar paths que começam com `#` e fazer `scrollIntoView` + fechar menu, em vez de `navigate`
2. **Desktop**: Mover o botão de suporte (HelpCircle) para fora do bloco `{user && ...}`, tornando-o sempre visível
3. **Mobile**: Adicionar botão de suporte fora do bloco `{user ? ... : ...}`, junto com o botão de idioma (sempre visível)

| Arquivo | Ação |
|---|---|
| `src/components/Header.tsx` | Suporte sempre visível + fix scroll para âncoras |

