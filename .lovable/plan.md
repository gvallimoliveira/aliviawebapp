
O usuário quer simplificar e unificar a navegação mobile:
- Remover o botão flutuante (`GlobalMobileMenu`) que está cobrindo a logo
- Garantir que o menu hamburguer esteja sempre presente no header (canto superior direito) em todas as páginas no mobile
- Limpar ícones redundantes do header desktop (suporte e idioma) já que ficarão dentro do menu
- Manter apenas o botão "Sair" visível diretamente no header (quando logado)

Hoje várias páginas (Dashboard, Gateway, etc.) não renderizam o `Header` global — por isso foi criado o botão flutuante. A solução correta é tornar o `Header` global e presente em todas as rotas (exceto fluxos críticos como `/assessment`, `/auth`, `/payment-success`).

## Plano

**1. Tornar o Header global no `App.tsx`**
- Renderizar `<Header />` no layout raiz (uma única vez), dentro do Router
- Criar lista de rotas onde o Header deve ser ocultado (fluxos críticos: `/assessment`, `/auth`, `/payment-success`, `/aceitar-convite`, `/reset-password`, `/complete-profile`, `/hep/`, `/feedback/clinic`)
- Implementar componente wrapper `ConditionalHeader` que usa `useLocation` para decidir

**2. Remover renderizações duplicadas do Header**
- Buscar páginas que importam e renderizam `<Header />` localmente (Index, ProfessionalLanding, Blog, Suporte, Conta, etc.) e remover essas chamadas, já que passará a ser global

**3. Remover `GlobalMobileMenu`**
- Deletar o componente e sua referência no `App.tsx`
- Não é mais necessário — o Header (com seu próprio hamburguer mobile) estará sempre presente

**4. Limpar ícones redundantes do Header (desktop)**
- Remover botão de Suporte (HelpCircle) — já está no menu mobile e pode ser acessado via menu desktop também (manter no menu hamburguer mobile)
- Remover botão de Idioma (Globe) do desktop — manter apenas dentro do menu mobile
- Manter no desktop: Logo, links de navegação (compare/how/blog/profissionais), botão Dashboard, ícone Admin, ícone Conta, botão Sair (LogOut)
- Manter no mobile: apenas Logo + hamburguer (que abre tudo: idioma, suporte, conta, admin, sair)

Aguarde — relendo o pedido: "remover o ícone de suporte e de idioma que se tornarão redundantes. Mantenha apenas o botão de sair". Isso aplica-se ao header desktop. O menu hamburguer (mobile) continua tendo todos os itens. Confirmado.

**5. Garantir z-index e posicionamento corretos**
- Header já é `sticky top-0 z-50` — funciona bem
- Hamburguer mobile fica no canto superior direito (já está assim no Header atual)

## Arquivos a modificar
- `src/App.tsx` — adicionar Header global condicional, remover `GlobalMobileMenu`
- `src/components/Header.tsx` — limpar botões desktop redundantes (Globe, HelpCircle)
- `src/components/GlobalMobileMenu.tsx` — deletar
- Páginas que renderizam `<Header />` localmente — remover import e uso (Index, PatientLanding, ProfessionalLanding, Blog, BlogPost, Support, Account, Admin, ClinicLanding, etc.)

## Resultado esperado
- Logo nunca mais é coberta
- Menu hamburguer sempre visível no mobile (canto superior direito do header), em qualquer página não-crítica
- Header desktop mais limpo: navegação + Dashboard + Admin + Conta + Sair
- Idioma e Suporte ficam acessíveis via menu hamburguer (mobile) e via links/rotas normais (desktop pode acessar suporte pela URL `/suporte`)

Pequena ressalva: no desktop o usuário perderá o atalho de 1-clique para trocar idioma e ir ao suporte. Se preferir manter esses no desktop e remover só do mobile, me avise — caso contrário sigo com a remoção total conforme solicitado.
