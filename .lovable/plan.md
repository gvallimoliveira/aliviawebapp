

## Correções Mobile

### 1. Menu hamburger não aparece no celular

O botão hamburger está presente (linha 79-87 do Header.tsx) com `className="md:hidden"`, o que deveria funcionar. O problema provável é que o container pai usa `justify-between` mas pode haver elementos intermediários (como o link "Para Profissionais" mobile-only adicionado anteriormente) que estão empurrando o layout. Preciso verificar se há um botão mobile-only extra que foi adicionado e pode estar conflitando. O código atual parece correto — o hamburger deveria aparecer. Pode ser um problema de z-index ou overflow. Vou garantir que o botão hamburger tenha visibilidade forçada em mobile e remover qualquer elemento duplicado que possa interferir.

**Ação**: Revisar se há elementos extras entre o logo e o hamburger que possam estar causando overflow horizontal, escondendo o botão fora da tela.

### 2. Badge "Economize 30%" ilegível no botão Anual ativo

Quando o botão "Anual" está selecionado, ele recebe `bg-primary text-primary-foreground`. Dentro dele, a Badge usa `bg-emerald-500/10 text-emerald-600` — sobre o fundo primary (verde escuro), o texto emerald-600 fica invisível.

**Correção**: Quando `billing === "annual"`, a Badge deve usar cores com contraste adequado sobre o fundo primary, por exemplo: `bg-white/20 text-white border-white/30`.

### Arquivos a modificar
1. **`src/components/Header.tsx`** — Investigar e corrigir visibilidade do hamburger em mobile real (possível overflow do container)
2. **`src/components/ProfessionalSection.tsx`** — Alterar cores da Badge "Economize 30%" quando o botão Anual está ativo para garantir legibilidade

