// Curated decision support, not eligibility logic. Screenshot transcription lives
// in docs/rlca-referencia-clinica.md; unverified numerical cutoffs stay there.
export const RLCA_REFERENCE_VERSION = "rlca-2026-10-30-v1";

export function isRlcaRelevant(context: unknown): boolean {
  const text = (typeof context === "string" ? context : JSON.stringify(context ?? ""))
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /\b(?:r[-\s]?lca|lca|acl|acl[-\s]?r|aclr)\b|ligamento cruzado anterior|anterior cruciate ligament|ligamento cruzado anterior/.test(text);
}

const REFERENCE = `
R-LCA — REFERÊNCIA COMPLEMENTAR CURADA (${RLCA_REFERENCE_VERSION}):
Use somente se a pergunta/caso envolve LCA. Menção a lesão antiga ou questionário NÃO prova reconstrução, pós-operatório atual ou necessidade de tratamento. Distinguir pré-operatório, lesão não operada, pós-operatório e histórico assintomático. Não inferir cirurgia/enxerto/data/restrições.

Organização didática: contexto/fase clínica → objetivos prioritários → dados medidos e faltantes → critérios para discutir progredir/manter/reavaliar → cuidados e próxima checagem. Respeitar idioma, formato e limites de cada resposta; impressão clínica continua em prosa, sem prescrição de exercícios. Relacionar STEPS/D.I.F.I quando pertinente, sem converter mês em fase nem presumir dor/incapacidade em modo preventivo.

Antes de progressão pós-operatória, considerar tipo/data de cirurgia, enxerto/fixação, procedimentos associados (sobretudo menisco/raiz), protocolo do cirurgião, irritabilidade, amplitude, derrame, ativação do quadríceps/SLR sem lag, marcha e objetivo funcional/esportivo. Se informação essencial não está disponível, declarar a lacuna. Não inventar medidas, escores ACL-RSI/IKDC, liberação ou normas.

Domínios a acompanhar (não calendário prescritivo): pré-operatório eletivo com extensão recuperada, derrame controlado, quadríceps e marcha; fase inicial com cicatrização, extensão, flexão e descarga conforme restrições; fortalecimento e controle progressivos; corrida/saltos apenas com critérios clínicos/funcionais e autorização pertinente; preparação específica com aterrissagem, desaceleração, mudanças de direção, fadiga e confiança; retorno à participação → ao esporte → ao desempenho por decisão compartilhada.

Métricas: LSI representa simetria, não força absoluta — ambos os membros podem estar destreinados. Registrar força absoluta e método/unidade; kgf não é Nm nem Nm/kg, e força isométrica medida não equivale automaticamente a carga de exercício. IQ:QD é flexores/extensores no MESMO membro, dependente de método/velocidade, não LSI. Hop tests exigem qualidade/estratégia além de distância. Y Balance requer direção e protocolo. ACL-RSI/IKDC complementam, não substituem exame. Padronizar aquecimento, ordem, lado de referência e fadiga; não testar esforço com irritação/complicação sem avaliação prévia.

Evidência identificada (não atribuir PEDro fictício):
- Kotsifaki et al., Aspetar guideline, BJSM 2023, DOI 10.1136/bjsports-2022-106158, PMID 36731908. Exercício e progressão individualizada; CCA de extensão do joelho pode começar em arco limitado 90°–45° a partir da semana 4, ajustando carga/dor anterior e contexto cirúrgico. Isso NÃO libera extensão terminal resistida pesada. Critérios propostos para corrida incluem quadríceps LSI >80% juntamente com amplitude, derrame, dor e desempenho; o número isolado não autoriza correr.
- Meredith et al., Panther RTS consensus, KSSTA 2020, DOI 10.1007/s00167-020-06009-1, PMID 32347344: decisão multidimensional/compartilhada; abandonar tempo COMO ÚNICO critério, não ignorar biologia.
- Grindem et al., BJSM 2016, DOI 10.1136/bjsports-2016-096031, PMID 27162233; Beischer et al., JOSPT 2020, DOI 10.2519/jospt.2020.9071, PMID 32005095: coortes associam retorno precoce ao esporte exigente, antes de 9 meses, a maior risco de nova lesão. Associação não é causalidade individual; completar 9 meses não garante segurança, e o contexto dos jovens/esportes com pivô importa.

Sete prints educacionais sportcare.fisio enviados em 30/10/2026 inspiram a hierarquia objetivos/medição/avançar-manter-regredir. NÃO são diretriz validada. Não universalizar cortes de IQ:QD, ACL-RSI, IKDC, Y Balance ou Teste T, teto de flexão após sutura meniscal, percentuais automáticos de redução de carga, níveis indefinidos de pliometria, semana 5–6 como nadir universal do enxerto ou quarto mês como liberação universal de extensão terminal.

Prioridade de segurança para ESTE contexto sobre heurísticas genéricas de carga: respeitar restrições cirúrgicas e sinais de irritação/complicação; nunca liberar corrida/pivô/competição/alta por calendário ou bateria isolada. Febre/secreção ou piora importante com joelho quente, dor/inchaço de panturrilha, bloqueio/perda persistente de extensão ou falseio novo pedem avaliação apropriada; falta de ar/dor torácica súbitas compatíveis com embolia exigem emergência. Orientações de reduzir exposição não substituem avaliação médica.
`;

export function buildRlcaReference(context: unknown): string {
  return isRlcaRelevant(context) ? REFERENCE : "";
}