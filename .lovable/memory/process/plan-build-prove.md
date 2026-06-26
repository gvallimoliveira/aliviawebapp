---
name: Plan → Build → Prove Protocol
description: Regra obrigatória de 3 portões + auto-auditoria para qualquer plano multi-fases, evitando declarar "concluído" sem verificação ativa.
type: preference
---

# Protocolo Plan → Build → Prove

Aplica-se a TODA fase de plano multi-etapas (ex.: plano de créditos do workspace, refactors grandes, novas features com backend).

## Portão 1 — Plano
Antes de codar, listar:
- Arquivos a criar/editar
- Tabelas e edge functions afetadas
- **Critério objetivo de sucesso verificável** ("tabela X com ≥1 linha após ação Y")
Se o critério não é verificável, refazer.

## Portão 2 — Build
Checklist por tipo:
- **Edge function com I/O async**: `EdgeRuntime.waitUntil` usado? Response body consumido? Erros logados?
- **Migration**: `GRANT` presente para roles certos? RLS habilitada? Política testada?
- **Frontend que invoca função**: parâmetros via body (não URL) em `supabase.functions.invoke`.

## Portão 3 — Prova (obrigatório antes de "concluída")
Executar pelo menos UMA verificação ativa e mostrar resultado:
- Backend: `supabase--read_query` mostrando dados.
- Edge function: `curl_edge_functions` ou logs de execução real.
- Frontend: Playwright headless screenshot ou leitura do componente final.
- Stripe/integrações: `stripe_api_read` confirmando objeto criado.

## Portão 4 — Auto-auditoria
Antes de declarar "Fase N concluída", responder no chat:
1. O que o plano dizia que esta fase entregaria?
2. O que verifiquei funcionando (com qual evidência)?
3. O que **não** verifiquei e por quê (risco aceito + como detectar depois)?

## Comandos de escape do usuário
- **"prove"** → executar Portão 3 imediatamente.
- **"auditar fase N"** → re-ler plano + código + rodar verificações + relatar discrepâncias.
- **"não avance"** → parar mesmo se o próximo passo parecer óbvio.

## Origem
Criado após o bug do `waitUntil` (Fase 2 do plano de créditos do workspace) ter sido marcado como concluído sem verificar que `ai_credit_usage` recebia linhas. Custo: ~3 dias de "shadow tracking" produzindo 0 dados.
