

# PDF básico (2 ajustes) + Correção de leads + Otimização do Admin

## Parte 1 — PDF Básico: Logo no box motivacional

**Arquivo:** `src/utils/generatePdf.ts` (linhas 803-815)

Adicionar o logo da Aliv.iA no canto direito do retângulo verde da mensagem motivacional. O logo já está carregado como `logoBase64`. Inserir com `doc.addImage()` no canto superior direito do `roundedRect` verde, com tamanho ~10x10mm (similar ao header de 14x14). Ajustar o `splitTextToSize` para `motInnerW - 28` para não sobrepor o logo.

## Parte 2 — PDF Básico: Quebrar questionários por linha

**Arquivo:** `src/utils/generatePdf.ts` (linhas 745-751)

Hoje o bullet de questionários junta tudo em uma linha só (`SPADI + KOOS — Shoulder Pain...`), que estoura a margem quando há múltiplos questionários. Correção: ao invés de um único bullet, gerar um bullet por questionário aplicável. Cada um fica em sua própria linha: `✅ SPADI — Shoulder Pain and Disability Index` / `✅ KOOS — Knee injury...`. Ajustar `totalBulletH` para refletir o número extra de linhas.

## Parte 3 — Leads não aparecem no admin

**Problema raiz identificado:** Os dados no banco confirmam que **todas** as avaliações básicas têm `patient_email` vazio. Isso ocorre porque os usuários que fizeram avaliações básicas estavam **logados** — e o WelcomeStep só pede email quando `!user` (não logado). Logo, `capturedEmail` fica `null` e o insert grava `null`.

**A query `list_leads`** filtra por `patient_email IS NOT NULL` — como todos são `null`, retorna 0 leads.

**Correção em `src/pages/Assessment.tsx`** (linhas 249-260): Na função `createAssessment`, para modo `basic`, se o usuário estiver logado e `capturedEmail` for null, usar o email do auth user (`user.email`) como `patient_email`. Também popular `patient_name` a partir do perfil quando disponível.

```typescript
patient_email: capturedEmail || user?.email || null,
patient_name: capturedName || null,
```

Isso garante que avaliações básicas feitas por usuários logados também apareçam como leads.

## Parte 4 — Otimizações do painel Admin

### Diagnóstico atual
O admin é uma página longa com 6 seções empilhadas verticalmente: VIP Users → Profissionais → Parceiros → Blog → Suporte → Leads. Problemas:
- Scroll excessivo para acessar seções inferiores
- Sem visão geral rápida do estado do sistema
- Seções de gestão similar (Profissionais/Parceiros) ficam separadas

### Sugestões de otimização

1. **Navegação por Tabs** — Agrupar as 6 seções em tabs para acesso direto sem scroll:
   - **Dashboard** (novo) — Cards resumo com métricas-chave de cada área
   - **Usuários** — VIP Users (conteúdo atual)
   - **Profissionais** — Unificar Profissionais + Parceiros em sub-tabs
   - **Conteúdo** — Blog
   - **Suporte** — Tickets
   - **Leads** — Lead Management

2. **Tab "Dashboard" com overview** — Cards de resumo rápido:
   - Total VIPs / Profissionais pendentes / Tickets abertos / Leads novos (7 dias) / Posts publicados
   - Cada card clicável para navegar à tab correspondente

3. **Unificar Profissionais + Parceiros** — Parceiros são profissionais com `is_partner=true`. Faz sentido estarem juntos com um filtro/sub-tab ao invés de seções separadas.

4. **Indicador de "pendências"** — Badge numérico nas tabs de Profissionais (pendentes de aprovação) e Suporte (tickets abertos) para o admin ver rapidamente onde precisa agir.

## Arquivos a alterar

1. `src/utils/generatePdf.ts` — Logo no box verde + quebrar questionários por linha
2. `src/pages/Assessment.tsx` — Usar `user.email` como fallback para `patient_email`
3. `src/pages/Admin.tsx` — Refatorar para usar Tabs com Dashboard overview
4. `src/components/admin/LeadManagement.tsx` — Expor contagem para o dashboard summary

