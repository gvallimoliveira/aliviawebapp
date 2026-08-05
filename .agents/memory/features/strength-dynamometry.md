---
name: Strength Dynamometry
description: Regras da dinamometria — medidas múltiplas, tempo até o pico opcional, assimetrias L/R e agonista/antagonista com limite de 10%.
type: feature
---

- Cada movimento/lado aceita 2–3+ medidas (`leftTrials`/`rightTrials`); o sistema mostra força máxima, média, n e CV.
- **Tempo até o pico é OPCIONAL** (muitos dinamômetros não fornecem). Campo escondido por padrão, exibido via toggle ou quando o laudo importado já traz o dado. A IA nunca deve inventar esse valor.
- Dados essenciais: força máxima e média por medida, movimento, lado, assimetria e data (panorama evolutivo).
- Assimetrias calculadas pela **média** das medidas:
  - Lado direito vs esquerdo (por movimento).
  - Agonista vs antagonista no MESMO lado para: rotação interna vs externa de ombro; extensão vs flexão de joelho; extensão vs flexão de quadril; adução vs abdução de quadril.
- Semáforo: **≤10% verde**, **>10% vermelho** (sem faixa intermediária). Vale para UI e PDF.

## Extração por IA (imagem/PDF)
- `extract-dynamometry` usa **tool/function calling** (schema com `leftTrials`/`rightTrials`) e cadeia de modelos com Gemini 2.5 **Pro** primeiro (precisão de leitura de tabela > custo neste import pontual).
- A chave do cache inclui `PROMPT_VERSION`; **sempre** bumpar essa constante ao mexer no prompt/schema, senão o mesmo arquivo devolve a extração antiga.
- Backend recalcula a média a partir das medidas; média impressa no laudo serve só para conferência (`reviewFlags: mean_mismatch` quando divergir >15%).
- UI mantém a seção ancorada (preserve scroll) durante import e salvamento — não deixar a página pular para o topo.
