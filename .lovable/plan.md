# Fase 5 — Enforcement gradual dos créditos IA (subdividida)

**Contexto:** parceiros usando, sem vendas ainda, conta workspace absorvendo o custo. Objetivo: deixar o sistema pronto pra quando começarem as vendas, sem risco de bloquear parceiro/VIP por engano e sem susto de comunicação.

**Trilho de segurança em toda fase:**
- Flag global `app_config.ai_credits_enforced` continua **false** durante 5.0–5.2 (só UI e telemetria). Só vira `true` na 5.3, com rollout escalonado.
- Bypass **sempre respeitado** antes de qualquer débito ou aviso: VIP (`vip_users` + fallback hardcoded), `professionals.is_partner`, admin.
- Clínica: política de **carência de 20%** acima da cota inclusa antes de consumir pacotes ou bloquear (canônico 2026-07). Dentro da carência, só avisa.
- Reversão: um `UPDATE app_config SET value='false' WHERE key='ai_credits_enforced'` volta tudo ao comportamento atual em segundos.

---

## 5.0 — Seed de quotas + função de leitura (zero UX)

Popular `ai_credit_quotas` com os valores canônicos e criar helper `get_user_credit_status(user_id)` que retorna `{tier, used, quota, purchased_balance, pct}`. **Nada aparece pro usuário ainda.**

Quotas (por mês):
- pro_monthly 60 · pro_annual 72  *(valor canônico atual — ver `mem://business/ai-credits-canonical`)*
- academic_monthly 60 · academic_annual 72
- clinic_small 200/terapeuta · clinic_medium 250 · clinic_large 300
- premium_b2c 15 · unlimited (VIP/partner) sem trava

**Portão de prova:** `SELECT * FROM get_user_credit_status('<uid teste>')` retorna valores certos para VIP, parceiro, PRO comum e clínica.

## 5.1 — Widget honesto no dashboard (só informa)

`AiCreditsWidget` passa a mostrar barra "X / Y créditos usados este mês" com tom otimista. VIP/parceiro vê badge "Uso ilimitado 🎁" sem barra. Ainda nenhum bloqueio ou warning.

**Portão de prova:** screenshot Playwright de 3 perfis (VIP, parceiro, PRO comum) no dashboard mobile e desktop.

## 5.2 — Warning a 80% + toast informativo (ainda sem bloqueio)

- Banner soft no topo do dashboard quando `pct ≥ 80%`: "Você já usou 80% dos créditos deste mês — a recarga acontece em X dias, ou você pode complementar com um pacote."
- Push notification opcional (1 vez por ciclo) via `send-push-notification`.
- VIP/parceiro nunca recebem.
- Clínica: warning vai pro dono, não pra cada terapeuta.

**Portão de prova:** simular usuário com 85% via `INSERT` em `ai_credit_usage`, ver banner aparecer; conferir que VIP não vê.

## 5.3 — Enforcement em VIP + parceiros primeiro (canário paradoxal)

Ligar `ai_credits_enforced=true` **somente** em ambiente de canário: código lê a flag, mas o bypass VIP/parceiro continua explícito. Objetivo: garantir que o caminho de "consultar quota + decidir" não introduz regressão nem latência nas contas críticas.

- Instrumentar `_shared/ai-credits.ts` com `assertCreditsAvailable()` que:
  1. Checa VIP → retorna `{ok:true, unlimited:true}` sem consultar quota.
  2. Checa `is_partner` → mesmo.
  3. Consulta saldo (pacote comprado FIFO por `expires_at` → quota mensal).
  4. Se `ok`, débito é logado normalmente pelo helper atual.

**Portão de prova:** rodar 24h com flag ligada; verificar em logs que VIP/parceiros nunca entram no ramo "consulta quota" e que latência p95 das edge functions de IA não subiu.

## 5.4 — Soft-block real para PRO/Acadêmico/Premium (Clínica fica de fora)

Quando `pct ≥ 100%` em PRO/Acadêmico/Premium:
- Edge functions de IA retornam 402 com payload `{error:"credits_exhausted", reset_at, buy_url}`.
- Frontend mostra modal otimista: "Você aproveitou todos os créditos deste mês 🎉 — recarga em X dias, ou complete agora com um pacote."
- Botão CTA abre `AiCreditsStore`.
- Clínica **não entra nesta sub-fase**: continua só com warning.

Rollout: começar por 1 email teste (você), depois 10% dos PROs por hash do user_id, depois 100%.

**Portão de prova:** conta de teste PRO com quota zerada → chamada a `generate-diagnosis` retorna 402 e modal aparece corretamente. VIP/parceiro na mesma condição continuam funcionando.

## 5.5 — Soft-block em Clínica (opcional, só se dados mostrarem abuso)

Só ativar se o painel admin mostrar clínica consistentemente >150% da quota. Modelo: dono da clínica recebe email + banner "sua equipe passou do incluso; considere upgrade ou pacote". Terapeutas continuam usando (nunca bloqueia atendimento).

**Portão de prova:** manual — só decidimos com dados na mão.

---

## O que fica pra depois (fora da Fase 5)

- **Fase 6** — reajuste dos planos de clínica com base em custo real (só faz sentido após 60d de dados enforced).
- **A7** — landings/páginas de suporte falando abertamente dos créditos (planejado no `strategic-improvements-plan.md`; melhor entrar junto ou logo depois da 5.4 pra alinhar comunicação com comportamento).

## Ordem sugerida de execução

Fazer 5.0 e 5.1 juntos num deploy (baixo risco, ambos só informativos). Depois pausa curta pra observar. 5.2 sozinho. 5.3 sozinho (crítico pra confirmar bypass). 5.4 em rollout de 3 ondas. 5.5 sob demanda.

Posso começar por 5.0 + 5.1 no próximo passo, se você aprovar.
