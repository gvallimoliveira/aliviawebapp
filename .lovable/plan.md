# Plano: Install-as-App + Reorganização dos menus

## 1. "Instale como App" (PWA / Atalho na Tela Inicial)

Criar um componente único e reaproveitável **`InstallAppGuide`** com instruções passo a passo expansíveis (Accordion), detectando automaticamente iOS / Android / Desktop e mostrando o fluxo correto. Toggle "Mostrar / Ocultar passos".

Conteúdo (3 abas internas):
- **iPhone / iPad (Safari):** Toque em Compartilhar → "Adicionar à Tela de Início" → Adicionar.
- **Android (Chrome):** Toque no menu ⋮ → "Instalar app" ou "Adicionar à tela inicial".
- **Desktop (Chrome/Edge):** Ícone de instalar na barra de endereços → Instalar.

Inclui nota: "Não é um app de loja — é o mesmo site funcionando como atalho, sempre atualizado, sem ocupar espaço extra."

### Onde inserir

**A. Landing pages (pré-login)** — versão "vitrine", colapsada por padrão, com badge "📱 Use como app no celular":
- `PatientLanding.tsx` — uma seção curta antes do Footer.
- `ProfessionalLanding.tsx` — idem.
- `ClinicLanding.tsx` — idem.
- `LandingLegacy.tsx` — idem.

**B. Dentro do sistema (pós-login)** — versão "utilitária":
- **Gateway (`/`)** logado: card discreto abaixo do seletor de perfis ("Acesso rápido: instale o Aliv.iA no seu celular").
- **Dashboard:** card dispensável no topo da aba "Visão geral" (com `localStorage` para "não mostrar mais"), aparecendo só nas primeiras visitas e quando `display-mode: standalone` é falso.
- **Suporte (`Support.tsx` e `ClinicSupport.tsx`):** entrada permanente na seção "Dicas de uso" → "Como instalar o Aliv.iA no celular" (sempre acessível, nunca dispensa).
- **Menu lateral global:** novo item "Instalar como app" que abre um Dialog com o mesmo guia (atalho rápido em qualquer página).

### Lógica de detecção
- Esconder o card automático quando `window.matchMedia('(display-mode: standalone)').matches` (já instalado).
- Detectar UA para abrir aba correta por padrão (iOS / Android / Desktop), mas permitir trocar.

## 2. Menu lateral global — reorganização

Hoje o `GlobalMobileMenu.tsx` (e o `Header.tsx`) misturam itens da landing do paciente com itens globais, e não citam o Aliv.iA Clínica. Proposta de itens, agrupados, válidos para **qualquer** página:

### 🏠 Navegação principal
1. **Meu Painel** (`/dashboard`) — só se logado, destaque.
2. **Início** (`/`) — Gateway.

### 🌐 Conheça o Aliv.iA
3. **Para Pacientes** (`/para-pacientes`)
4. **Para Profissionais** (`/profissionais`)
5. **Aliv.iA Clínica** (`/clinica`) ← **novo**
6. **Blog** (`/blog`)

### ⚙️ Conta & Utilidades
7. **Minha Conta** (`/conta`) — só logado.
8. **Admin** (`/admin`) — só admin (hoje aparece para todo logado; manter como está por escopo, mas marcar como melhoria futura).
9. **Instalar como App** ← **novo**, abre Dialog com `InstallAppGuide`.
10. **Suporte** (`/suporte` ou `/clinica/suporte` conforme contexto ativo)
11. **Idioma: PT / EN / ES** (mantém toggle atual)

### 🚪 Sessão
12. **Entrar** (`/auth`) — se deslogado.
13. **Sair** — se logado.

### Itens removidos do menu mobile
- "Sobre o Aliv.iA" como item separado (consolidado em "Para Pacientes" e nas demais landings de "Conheça").
- Âncoras `#compare` e `#how` (eram da landing legacy e não fazem sentido em outras páginas).

### Arquivos afetados
- `src/components/GlobalMobileMenu.tsx` — nova estrutura agrupada com separadores e títulos de grupo.
- `src/components/Header.tsx` — mesmo conteúdo no Sheet mobile do Header para consistência (Para Pacientes / Para Profissionais / Aliv.iA Clínica / Blog / Instalar app / Suporte / Idioma).
- `src/locales/pt.json`, `en.json`, `es.json` — chaves novas: `nav.patient`, `nav.clinic`, `nav.installApp`, `nav.groupExplore`, `nav.groupAccount`, etc.

## 3. Novos arquivos
- `src/components/InstallAppGuide.tsx` — componente com Tabs (iOS/Android/Desktop) + Accordion de passos + detecção UA + check de `display-mode: standalone`.
- `src/components/InstallAppCard.tsx` — wrapper dispensável para Dashboard/Gateway (usa `localStorage` key `alivia_install_card_dismissed`).
- Reutilizado em Landing, Support, Dialog do menu.

## 4. Não-objetivos
- **Não** transformar em PWA real (sem service worker / offline). Apenas instruções de atalho — alinha-se à diretriz "manifest-only, sem SW".
- **Não** alterar lógica de auth, rotas ou backend.
- **Não** mexer no `Header` desktop (apenas no Sheet mobile dele para consistência).

## Detalhes técnicos
- Componente puramente client-side, sem dependências novas (usa shadcn `Tabs`, `Accordion`, `Dialog`, `Card`).
- Verificação `standalone` via `useEffect` + `matchMedia` (evita SSR issues — projeto é SPA Vite, ok).
- Texto traduzido em 3 idiomas via i18n existente.
- Sem mudanças de DB, edge functions ou auth.

Aprovando, implemento em uma única passada.
