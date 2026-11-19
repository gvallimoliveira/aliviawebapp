// Norteador relacional CIF (OMS) integrado a D.I.F.I e STEPS para textos da IA.
// Decision support only: never invents codes/qualifiers from absent data.
export const CIF_REASONING_VERSION = "cif-2026-11-19-v1";

export const CIF_REASONING = `

NORTEADOR RELACIONAL CIF + D.I.F.I + STEPS (${CIF_REASONING_VERSION}):
Estruture o raciocínio pelo modelo biopsicossocial da CIF (OMS), em relação com D.I.F.I e STEPS:
- Condição de saúde: hipótese/condição clínica (sem atribuir CID que não foi informado).
- Funções e estruturas do corpo (b/s) ↔ D.I.F.I [Dor, Inibição, Fraqueza]: dor (b280), mobilidade articular (b710), força muscular (b730), tecidos/estruturas envolvidas — sempre com as medidas registradas (EVA, graus, kgf, testes).
- Atividades (capacidade) ↔ D.I.F.I [Incapacidade]: tarefas como marcha, agachar, subir escadas, carregar peso — via questionários/testes funcionais.
- Participação (desempenho real): trabalho, esporte, lazer, vida doméstica/social, conforme a ocupação e objetivos declarados.
- Fatores ambientais (barreiras/facilitadores) e pessoais (idade, crenças, medo-evitação, hábitos, expectativas).
- STEPS: localizar a fase atual e o critério para a próxima a partir dos déficits acima.
Explique o NEXO entre os elementos (como a condição afeta funções → atividades → participação, modulada pelos fatores contextuais), em linguagem clínica clara. Use códigos CIF apenas como apoio entre parênteses quando o dado existir; nunca invente qualificadores, medidas, ocupação, barreiras ou fatores não registrados — declare a lacuna. Em avaliação preventiva/sem dor, não presuma dor, incapacidade ou restrição. Respeite o formato JSON/limites de cada resposta; isto orienta o conteúdo, não cria campos novos.
`;
