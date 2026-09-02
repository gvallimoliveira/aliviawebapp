---
name: Exercise Video Monthly Audit
description: Auditoria mensal automática dos vídeos do YouTube da biblioteca de exercícios (cron, edge function, aba Vídeos no Admin).
type: feature
---

- Edge function `exercise-video-audit` (verify_jwt=false): autentica por `x-internal-secret` (cron) ou JWT de admin (`is_admin`).
- Checa cada `exercise_library.video_url` por oEmbed: link morto → `video_status='broken'`; título pouco parecido (score bilíngue PT/EN + sinônimos < 0.34) → `video_status='mismatch'` (apenas sinal de revisão, gera falsos positivos aceitáveis); OK → `video_status='ok'`.
- Também varre `youtube_video_cache` e apaga entradas com vídeo morto.
- Registra cada execução em `exercise_video_audit_runs` (issues em jsonb) e dispara `notify-admin` quando há quebrados/divergentes.
- Cron `exercise-video-audit-monthly`: `0 6 1 * *`.
- UI: aba "Vídeos" em `/admin` (`AdminVideoAudit.tsx`) com resumo, lista de pendências, histórico e botão "Rodar agora".
- Baseline 02/09/2026: 113 vídeos, 0 quebrados, 13 marcados para revisão.
