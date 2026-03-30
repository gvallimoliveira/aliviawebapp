

## Adicionar seção "Sobre" na pré-landing (Gateway)

### O que será feito

Inserir uma seção "Sobre a Aliv.iA" entre o social proof badge e o footer minimalista da página Gateway (`/`). A seção apresenta a história de origem e a missão da plataforma de forma humanizada e concisa, com texto refinado pela IA mantendo a essência descrita.

### Conteúdo (refinado)

**PT:** A Aliv.iA nasceu da inquietação de Guilherme, fisioterapeuta carioca, ao observar a quantidade de orientações sem embasamento e sem qualquer triagem ou avaliação adequada circulando pela internet. Com a missão de mudar essa realidade, ele idealizou e construiu a Aliv.iA — uma plataforma que combina inteligência artificial e raciocínio clínico para ajudar duas frentes: pessoas que buscam resolver suas dores com mais segurança e base científica, e fisioterapeutas que desejam chegar mais preparados às suas avaliações, com relatórios de evolução que agregam valor real ao atendimento. Tudo isso com preço justo e acessível.

**EN:** Versão equivalente em inglês.

### Design

- Ícone `Heart` ou `Sparkles` como destaque visual
- Card sutil com borda, fundo translúcido (`bg-card/60 backdrop-blur-sm`), rounded corners
- Título "Sobre a Aliv.iA" centralizado acima do texto
- Largura máxima `max-w-2xl`, texto `text-sm text-muted-foreground`, alinhamento central
- Animação `fadeUp` consistente com o resto da página

### Alterações

| Ação | Arquivo |
|------|---------|
| Editar | `src/pages/Gateway.tsx` — adicionar seção "Sobre" antes do footer |
| Editar | `src/contexts/LanguageContext.tsx` — chaves `gateway.about_title` e `gateway.about_text` (PT/EN) |

