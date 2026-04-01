

## 3 Pontos: Diário de Dor, Fluxo Básico→Premium, e Suporte Público

### Ponto 1 — Bug Confirmado: Diário de Dor visível para usuários básicos

**Problema**: No `Dashboard.tsx` linha 179, a condição `premiumAccess?.subscription_type !== "single"` retorna `true` quando `premiumAccess` é `null` (usuário sem premium). Isso faz o Diário de Dor e a Comparação de Métricas aparecerem para todos.

**Hierarquia correta de funcionalidades**:

```text
┌─────────────────────────────────────────────────────┐
│ BÁSICO (sem conta ou sem pagamento)                 │
│  • Avaliação básica gratuita (diagnóstico parcial)  │
│  • Histórico de avaliações                          │
│  • Buscar profissional (visualizar)                 │
│  • Mensagens                                        │
├─────────────────────────────────────────────────────┤
│ PREMIUM AVULSO (R$109 single)                       │
│  + Avaliação premium completa (1x)                  │
│  + Diagnóstico + Plano de tratamento                │
│  SEM: Diário de Dor, Comparação, Follow-up emails   │
├─────────────────────────────────────────────────────┤
│ PREMIUM MENSAL (R$79,90/mês)                        │
│  + Tudo do avulso                                   │
│  + 2 avaliações/mês                                 │
│  + Diário de Dor                                    │
│  + Comparação de Métricas                           │
│  + Follow-up emails                                 │
├─────────────────────────────────────────────────────┤
│ PRO (R$49/mês ou R$418,80/ano)                      │
│  + Painel profissional completo                     │
│  + Link personalizado, analytics, pacientes, PDFs   │
└─────────────────────────────────────────────────────┘
```

**Correção**: Mudar a condição de `premiumAccess?.subscription_type !== "single"` para `premiumAccess?.has_access && premiumAccess?.subscription_type === "monthly"`. Isso garante que só assinantes mensais vejam Diário de Dor e Comparação.

**Arquivo**: `src/pages/Dashboard.tsx` (linhas 179-184)

---

### Ponto 2 — Explicar fluxo Básico → Premium na Landing e Suporte

Adicionar uma seção clara na Landing Page de Pacientes e na página de Suporte explicando o fluxo de upgrade:

**Landing Page** (`src/pages/PatientLanding.tsx`):
- Novo componente `UpgradeFlowSection` posicionado após `HowItWorksSection`, com 3 passos visuais:
  1. "Faça a Avaliação Básica gratuita"
  2. "Crie sua conta para desbloquear a Premium"
  3. "Continue de onde parou — seus dados são preservados"
- Texto enfatizando que não há retrabalho: os dados da básica são transferidos e o usuário continua nos questionários e testes exclusivos.

**Suporte** (`src/pages/Support.tsx` + locales):
- Adicionar um FAQ extra nos `patientFaqKeys` explicando: "Se eu fizer a avaliação básica e depois comprar a premium, preciso refazer tudo?" com resposta detalhada sobre a continuidade.

**Arquivos**: `src/components/UpgradeFlowSection.tsx` (novo), `src/pages/PatientLanding.tsx`, `src/locales/pt.json`, `src/locales/en.json`, `src/locales/es.json`

---

### Ponto 3 — Página de Suporte pública (sem login)

**Recomendação**: Sim, vale tornar pública. Benefícios:
- Reduz barreira para potenciais clientes entenderem o produto
- FAQ e guias de ferramentas funcionam como conteúdo SEO
- Gera confiança antes do cadastro

**Implementação**:
- Remover o redirect para `/auth` no `Support.tsx` (linhas 72-74)
- Manter `SupportContactForm` condicionado a `user` — se não logado, exibir um CTA "Crie sua conta para enviar uma mensagem"
- Manter seleção de perfil (paciente/profissional) e FAQ/tools visíveis para todos

**Arquivo**: `src/pages/Support.tsx`

---

### Resumo de arquivos alterados

| Arquivo | Ação |
|---|---|
| `src/pages/Dashboard.tsx` | Corrigir condição do Diário de Dor (só monthly) |
| `src/components/UpgradeFlowSection.tsx` | Novo — seção visual do fluxo básico→premium |
| `src/pages/PatientLanding.tsx` | Incluir UpgradeFlowSection |
| `src/pages/Support.tsx` | Remover redirect obrigatório, condicionar form a auth |
| `src/locales/pt.json` | Textos do fluxo, FAQ novo, CTA suporte |
| `src/locales/en.json` | Idem |
| `src/locales/es.json` | Idem |

