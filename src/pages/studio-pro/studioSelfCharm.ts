/**
 * ACERVO CHARMOSO EXCLUSIVO — Aliv.iA Studio vendendo a si mesmo
 *
 * Fonte: "Aliv.iA Studio • Manual de Marca v1.0 • Guia Prático de Copy
 * Charmosa" (tabela abordagem comum x abordagem charmosa, 10 públicos-alvo),
 * entregue pelo dono do produto em ago/2026.
 *
 * ISOLAMENTO DE MARCA: nada aqui pode vazar para marca de cliente. Estas linhas
 * falam da ferramenta (feed, artes, Canva, lote, onboarding) — em uma marca de
 * fisioterapia ou de salão soariam como se o cliente vendesse o Studio. Por
 * isso o acervo só é lido quando `isStudioSelfBrand(brand)` é verdadeiro.
 *
 * A coluna fria fica registrada apenas como contraexemplo: nunca é renderizada.
 */

export type StudioSelfCharmRow = {
  id: string;
  /** Público-alvo do guia (rótulo original). */
  label: string;
  /** Termos que identificam o público na relação eleita. */
  match: RegExp;
  /** Como NÃO escrever. Documental. */
  cold: string;
  /** Ponto zero charmoso. */
  headline: { strong: string; rest: string };
  /** Apoio que fecha a ponte lógica. */
  sub: string;
  /** Convite seguro. */
  cta: string;
};

export const STUDIO_SELF_CHARM: StudioSelfCharmRow[] = [
  {
    id: "prestador-local",
    label: "Prestador Local",
    match: /prestador|servi[çc]o local|aut[oô]nom|bairro.*servi[çc]o|encanador|eletricist|pintor|reforma/i,
    cold: "Poste toda semana no seu Instagram e consiga mais clientes. Clique aqui.",
    headline: {
      strong: "O seu serviço é impecável",
      rest: ", mas o seu feed está abandonado há três meses.",
    },
    sub: "Que tal parecer tão profissional nas redes quanto você é no trabalho real?",
    cta: "Parecer o profissional que já sou",
  },
  {
    id: "beleza-estetica",
    label: "Beleza e Estética",
    match: /beleza|est[eé]tic|sal[ãa]o|cabelo|unha|maquiagem|barbe|spa|skin/i,
    cold: "Preencha sua agenda da semana. Temos posts prontos para o seu salão.",
    headline: {
      strong: "Pare de postar fotos de resultado no escuro",
      rest: " e torcer pela sorte.",
    },
    sub: "Construa a presença visual que faz a cliente de alto valor escolher você sem pedir desconto.",
    cta: "Atrair a cliente certa",
  },
  {
    id: "alimentacao",
    label: "Alimentação",
    match: /aliment|comida|gastron|confeit|padari|restaurante|delivery|marmit|card[aá]pio|doce|bolo/i,
    cold: "Divulgue seu cardápio de encomendas. Clique para assinar o Studio.",
    headline: {
      strong: "Chega de responder a mesma pergunta no WhatsApp",
      rest: " dez vezes ao dia.",
    },
    sub: "Seu cardápio merece uma vitrine visual clara que vende antes mesmo de você responder.",
    cta: "Montar a minha vitrine",
  },
  {
    id: "saude-bem-estar",
    label: "Saúde e Bem-Estar",
    match: /sa[uú]de|bem[-\s]?estar|fisioterap|nutri|psic|odonto|dentist|pilates|personal|terapeut|consult[oó]rio/i,
    cold: "Crie posts educativos sem perder tempo no Canva. Baixe o app.",
    headline: {
      strong: "Você não estudou anos",
      rest: " para virar designer do próprio consultório.",
    },
    sub: "Transmita autoridade ética e conquiste o paciente certo, sem criar uma única arte do zero.",
    cta: "Conquistar o paciente certo",
  },
  {
    id: "b2b",
    label: "Serviços B2B",
    match: /b2b|contador|contabil|advoca|jur[ií]dic|consultoria|corporativ|engenhari|arquitet|seguros|financ/i,
    cold: "Marketing digital para contadores e advogados. Simplifique seus posts.",
    headline: {
      strong: "Assunto sério não precisa ser frio",
      rest: " nem cansativo.",
    },
    sub: "Explicamos o complexo com a sobriedade que seu mercado exige e a constância que a sua agenda pede.",
    cta: "Manter a constância com sobriedade",
  },
  {
    id: "comercio-bairro",
    label: "Comércio de Bairro",
    match: /com[eé]rcio|loja|varejo|mercadinho|papelari|pet shop|boutique|estoque|vitrine f[ií]sica/i,
    cold: "Aumente as vendas da sua loja física com posts em lote. Confira.",
    headline: {
      strong: "Estoque parado",
      rest: " é custo acumulado.",
    },
    sub: "Mostre suas novidades para o bairro hoje mesmo com a presença visual de quem compete com as grandes redes.",
    cta: "Mostrar as novidades hoje",
  },
  {
    id: "infoprodutor",
    label: "Infoprodutor",
    match: /infoprodut|lan[çc]amento|curso online|mentori|ebook|funil|audi[êe]ncia|creator/i,
    cold: "Aumente a conversão do seu próximo lançamento com artes prontas.",
    headline: {
      strong: "Um conteúdo brilhante não sustenta um lançamento",
      rest: " com artes pela metade.",
    },
    sub: "Conecte topo de funil à oferta com criativos que mantêm a sua audiência aquecida.",
    cta: "Aquecer a minha audiência",
  },
  {
    id: "marca-pessoal",
    label: "Marca Pessoal",
    match: /marca pessoal|pessoal|especialista|palestrante|autoridade|influen/i,
    cold: "Padronize seu feed e tenha mais engajamento nas redes sociais.",
    headline: {
      strong: "Seu conhecimento merece uma marca",
      rest: " reconhecida de longe.",
    },
    sub: "Pare de gastar horas no Canva e publique todo dia mantendo exatamente a mesma identidade.",
    cta: "Publicar todo dia sem perder identidade",
  },
  {
    id: "clinica-equipe",
    label: "Clínica / Equipe",
    match: /cl[ií]nic|equipe|time|secretari|multiprofissional|pequeno time/i,
    cold: "Gestão de redes sociais para pequenos times e clínicas. Teste agora.",
    headline: {
      strong: "Chega de depender da boa vontade do time",
      rest: " nas horas vagas.",
    },
    sub: "Centralize a identidade da sua equipe em um só lugar e mantenha o padrão em todas as peças.",
    cta: "Centralizar a identidade do time",
  },
  {
    id: "agencia-freela",
    label: "Agência / Freela",
    match: /ag[êe]ncia|freela|social media|designer|v[aá]rios clientes|onboarding|escalar/i,
    cold: "Produza mais rápido para vários clientes. Escale sua agência.",
    headline: {
      strong: "Produza para dez marcas",
      rest: " sem misturar um único elemento visual.",
    },
    sub: "Reduza o tempo de onboarding e aumente sua margem sem precisar contratar mais gente.",
    cta: "Aumentar a margem sem contratar",
  },
];

/**
 * Linha charmosa do público ativo — só para a marca do próprio produto.
 * Sem correspondência clara, cai na linha de marca pessoal (o público mais
 * amplo do Studio) em vez de devolver nada.
 */
export const findStudioSelfCharm = (probe: string): StudioSelfCharmRow | undefined => {
  const text = (probe ?? "").trim();
  if (!text) return undefined;
  return (
    STUDIO_SELF_CHARM.find((row) => row.match.test(text)) ??
    STUDIO_SELF_CHARM.find((row) => row.id === "marca-pessoal")
  );
};
