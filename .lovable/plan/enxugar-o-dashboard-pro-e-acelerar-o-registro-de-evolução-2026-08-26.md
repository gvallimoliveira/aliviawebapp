# Enxugar o dashboard PRO e acelerar o registro de evolução

Duas frentes: (1) reduzir a "peregrinação" até a lista de pacientes no dashboard profissional e (2) dar acesso em 1 toque ao registro de nota de sessão/evolução dentro do prontuário.

## 1. Dashboard profissional — nova hierarquia

Ordem atual (mobile, conforme o vídeo): banner acadêmico → **card Agente Clínico** → **card Plano Profissional** (grande) → upsell vitalício (condicional) → **card Link de Avaliação** (grande, com descrição longa) → alerta de avaliações pendentes → backup/exportação → lista de pacientes.

Ordem proposta:

```text
┌─────────────────────────────────────────────┐
│ Banners condicionais (acadêmico/trial/clínica)│  ← só aparecem quando relevantes
├─────────────────────────────────────────────┤
│ Faixa de status slim: 👑 PRO Ativo · renova  │  ← 1 linha; ações viram ícones
│ dd/mm · [engrenagem perfil] [instalar app]   │
├─────────────────────────────────────────────┤
│ Barra do link de avaliação (compacta):       │
│ 🔗 Seu link de pré-avaliação  [Copiar] [WA]  │  ← sem descrição longa nem URL expandida
├─────────────────────────────────────────────┤
│ ⚠ 18 avaliações pendentes de revisão      ⌄  │  ← linha única âmbar, expande sob demanda
├─────────────────────────────────────────────┤
│ PACIENTES (busca, filtros, lista)            │  ← protagonista da tela
└─────────────────────────────────────────────┘
```

Decisões por bloco:

- **Agente Clínico (card)** — remover do dashboard. O acesso já existe na barra inferior mobile (aba "Agente") e no menu. Zero perda de funcionalidade.
- **Plano Profissional** — de card grande para **faixa slim de 1 linha**: selo do plano + status + data de renovação + ícone de engrenagem (editar perfil) + botão "App". O botão "Gerenciar assinatura" sai daqui — já existe em Minha Conta → "Assinatura e cobrança" (SubscriptionCard), que é o lugar canônico de cobrança.
- **Link de avaliação** — de card com título + descrição de 3 linhas + URL visível para **barra compacta**: rótulo curto, botão Copiar e botão WhatsApp sempre visíveis (é a ação mais frequente, fica logo abaixo da faixa de status). A descrição longa vira tooltip/ícone de ajuda. Manter `data-onboarding="pro-link"` para o tour continuar funcionando.
- **Avaliações pendentes** — manter posição (logo acima da lista), mas como **linha única âmbar** sempre recolhida por padrão; expande ao tocar. Hoje já é expansível, porém ocupa ~2 linhas com respiro de card.
- **Backup e exportação** — remover o bloco `<details>` do dashboard e migrar `ExportDataCard` + `ImportDataCard` para **Minha Conta → seção "Privacidade e dados"** (abaixo do PrivacyRightsCard), visível apenas para contas com perfil profissional. Modo demo continua exibindo no dashboard de demonstração.
- **Upsell vitalício** — mantém comportamento condicional atual (só aparece para quem não tem vitalício; destaque maior só no 1º mês). Sem mudança.

Resultado: no mobile, a lista de pacientes sobe ~2,5 telas para perto do primeiro scroll.

## 2. Prontuário do paciente — registrar evolução em 1 toque

Hoje: para anotar a sessão, o profissional rola até "Notas de sessão" (ou usa o rail lateral) e ainda precisa clicar em "Adicionar". No dia a dia, com pressa, isso é atrito.

Proposta:

- **Botão de ação rápida "Registrar evolução"** no cabeçalho do paciente (PatientDetailView), ao lado das ações existentes — ícone `NotebookPen`. Desktop: botão discreto no header. Mobile: vira **FAB** (botão flutuante) no canto inferior direito, acima da barra de abas, visível apenas quando um prontuário está aberto.
- Ao tocar: rola suavemente até `sec-notas-sessao` **e abre o formulário de nova nota já com o cursor no campo de texto** (hoje o formulário só abre ao clicar em "Adicionar" dentro da seção).
- O rail lateral (PatientSectionRail) já tem o item "Notas de sessão"; ao acioná-lo, aplicar o mesmo comportamento de abrir o formulário.

## Implementação técnica

1. **`ProDashboard.tsx`** — remover o bloco do card Agente Clínico (linhas ~772-795); reescrever o card de status como faixa slim; reescrever o card do link como barra compacta; remover o `<details>` de backup/exportação. Preservar os atributos `data-onboarding` (`pro-welcome`, `pro-link`, `pro-patients`) para não quebrar o tour guiado.
2. **`Account.tsx`** — na seção "Privacidade e dados", renderizar `ExportDataCard` + `ImportDataCard` (mode `professional`) quando o usuário tiver perfil profissional ativo. Reaproveitar os componentes sem alterá-los.
3. **`SessionNotesSection.tsx`** — aceitar abertura externa do formulário: ouvir um evento customizado `window` (`alivia:open-session-note`) ou prop `openFormSignal`; ao receber, setar `showForm = true` e dar foco no textarea.
4. **`PatientDetailView.tsx`** — adicionar botão/FAB "Registrar evolução": `scrollIntoView` em `sec-notas-sessao` + dispatch do evento. FAB mobile posicionado acima da `ProBottomTabBar` (respeitando `safe-area-inset-bottom`), oculto quando houver modal aberto.
5. **`PatientSectionRail.tsx`** — item "Notas de sessão" também dispara o evento de abertura do formulário após a rolagem.
6. **Suporte** — atualizar Support.tsx + ClinicSupport.tsx (pt/en/es) na mesma loop, conforme regra do projeto.
7. Sem mudanças de backend, banco ou lógica clínica.
