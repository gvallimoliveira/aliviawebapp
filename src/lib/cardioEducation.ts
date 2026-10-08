import { profileRule } from "./cardioSafety";

/** Educational copy shared by the information dialog and both PDF variants. */
export const ISCHEMIC_GUIDANCE = "Se o teste documentar limiar isquêmico, considerar teto pelo menos 10 bpm abaixo desse limiar. Angina, arritmias e outras restrições exigem individualização pelo laudo e pela equipe médica; não aplicar a regra de 10 bpm indiscriminadamente.";
export const PULMONARY_GUIDANCE = "Na pneumopatia/DPOC, a FC é complementar: acompanhar dispneia (Borg CR10, frequentemente 3–5 em reabilitação supervisionada), fadiga de pernas, sintomas e SpO₂. A PSE geral registrada no app não é uma medida específica de dispneia. O alvo de saturação e eventual oxigênio devem seguir a prescrição; o aviso de SpO₂ <92% do app é triagem, não indicação automática de oxigênio.";
export const CEILING_GUIDANCE = "Os percentuais por perfil são referências iniciais do Aliv.iA para acompanhamento, não limites universais de segurança nem metas a atingir. FC abaixo do teto não exclui risco. Teste, sintomas, pressão arterial, medicação e restrições individuais prevalecem; cardiopatas e pneumopatas precisam de avaliação e liberação apropriadas.";

export const CARDIO_EDUCATION = [
  { title: "FC máxima, teto e zona-alvo são diferentes", text: "FC máxima estimada: Gellish, 207 − 0,7 × idade, com variabilidade individual. O teto é uma referência superior ajustável pelo fisioterapeuta; a zona-alvo é a faixa de esforço desejada para a sessão e costuma ficar abaixo dele. Um teste pode individualizar a prescrição. % da FC máxima não é % da reserva de FC: pela reserva, FC-alvo = FC de repouso + fração × (FC máxima − FC de repouso). Não intercambiar os percentuais." },
  { title: "Intensidade: qual escala está sendo usada?", text: "RPE e PSE significam percepção subjetiva de esforço. O app registra esforço global de 0 a 10 e calcula sRPE = minutos × PSE; sRPE é carga, não frequência cardíaca. Borg 6–20 e Borg CR10 são escalas diferentes, sem conversão exata. Como referência ACSM, esforço moderado corresponde a Borg 12–13, CR10 3–4 e cerca de 64–76% da FC máxima (40–59% da reserva); vigoroso a Borg 14–17, CR10 5–7 e cerca de 77–95% da FC máxima (60–89% da reserva). A PSE global 0–10 usada na estimativa OMS do app considera 5–6 moderado e ≥7 vigoroso; não equivale automaticamente à Borg CR10." },
  { title: "Adaptações: VO₂máx e mitocôndrias", text: "Treino aeróbio regular, inclusive moderado, pode melhorar a capacidade de utilizar oxigênio e estimular adaptações mitocondriais. Esforços vigorosos e intervalados, quando indicados, também podem melhorar o VO₂máx; não é necessário atingir o teto nem treinar sempre intenso. Volume, frequência, progressão, recuperação e condição inicial importam. O app não mede VO₂máx nem mitocôndrias; FC, ritmo e potência mostram respostas ao treino, não comprovam essas adaptações." },
  { title: "Metas semanais e distribuição", text: "OMS: adultos buscam 150–300 minutos moderados ou 75–150 vigorosos por semana, ou combinação equivalente, conforme tolerância e restrições. Qualquer atividade conta, inclusive abaixo da meta. O modelo ~80/20 é uma referência de alguns programas de endurance, não obrigação de todo atleta ou adulto ativo. As zonas Edwards do app são faixas de FC, não limiares ventilatórios medidos; a equivalência moderado/vigoroso é aproximada." },
  { title: "Cardiopata e betabloqueador", text: `${ISCHEMIC_GUIDANCE} Betabloqueadores alteram a resposta da FC: esforço percebido, sintomas e teste realizado sob a medicação orientam a prescrição; a FC fica como apoio. Em reabilitação cardíaca, Borg 11–14 pode ser uma referência supervisionada, individualizada pela equipe.` },
  { title: "Pneumopata / DPOC", text: PULMONARY_GUIDANCE },
  { title: "Segurança e limites da leitura", text: `${CEILING_GUIDANCE} Dor no peito, desmaio/tontura importante, palpitações ou falta de ar desproporcional exigem interromper o esforço e avaliação adequada. Queda de FC ≤12 bpm no 1º minuto é dependente do protocolo de recuperação; comparar pico com FC após um minuto no app é uma aproximação, não diagnóstico.` },
  { title: "TRIMP e FC ao acordar: o que cada curva mostra", text: "TRIMP (Training Impulse, método de Edwards) mede a carga do treino: soma os minutos de cada sessão ponderados pela zona de FC (Z1 ×1, Z2 ×2 … Z5 ×5); sem minutos por zona, o app estima pela FC média. É uma medida de carga, não uma frequência cardíaca. A FC ao acordar mede outra coisa: a recuperação do corpo no dia, pelo sistema nervoso autônomo. As duas curvas não têm fórmula entre si — o gráfico as coloca juntas para leitura clínica: carga crescente com FC ao acordar subindo acima do habitual sugere que a carga pode não estar sendo bem assimilada (semana mais leve); carga crescente com FC ao acordar estável sugere boa adaptação. A FC ao acordar sozinha não avalia carga, e semanas sem sessões de FC deixam a curva de TRIMP em zero." },
] as const;

export function profileEducation(profile: string, patient = false): string[] {
  const rule = profileRule(profile);
  const lines = [patient
    ? "A referência de batimentos não é uma meta a alcançar nem garantia de segurança. Combine o ritmo com seu fisioterapeuta e respeite sintomas e restrições."
    : CEILING_GUIDANCE];
  if (rule.key === "cardiac") lines.push(patient
    ? "Se você tem uma condição cardíaca, seu teste e as orientações da equipe médica definem os limites individuais do treino."
    : ISCHEMIC_GUIDANCE);
  if (rule.key === "pulmonary") lines.push(patient
    ? "Além dos batimentos, observe a falta de ar e o cansaço nas pernas. Seu fisioterapeuta pode usar uma escala de falta de ar de 0 a 10; ela é diferente da nota de esforço geral. Siga a orientação individual de oxigenação e não ajuste oxigênio por conta própria."
    : PULMONARY_GUIDANCE);
  lines.push(patient
    ? "Atividade regular, mesmo moderada, ajuda a construir condicionamento. Treinos mais intensos só entram quando indicados; este relatório não mede sua capacidade máxima de usar oxigênio (VO₂máx)."
    : "A melhora de ritmo/FC ou potência/FC sugere resposta ao treino em condições comparáveis, mas não mede VO₂máx nem adaptações mitocondriais.");
  return lines;
}