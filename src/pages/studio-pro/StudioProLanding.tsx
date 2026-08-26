import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Download,
  Images,
  Layers,
  Palette,
  Quote,
  Sparkles,
  Type,
  Wand2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS, PRODUCT, annualMonthlyPrice } from "./product";
import StudioProShowcase from "./StudioProShowcase";
import { SHOWCASE, type ShowcaseFormat } from "./showcase";

/**
 * LANDING DO STUDIO PÚBLICO
 *
 * Shell isolado: nenhum link, logo ou menção ao app clínico. Quem cai aqui vê
 * apenas um produto de criação de conteúdo estático (story, post, carrossel)
 * para qualquer nicho — com vitrine de exemplos para provar repertório.
 */

const STEPS = [
  {
    icon: Palette,
    title: "1. Traga sua marca",
    body: "Logo, cores e fontes — ou cole o site/Instagram e o Studio extrai o DNA visual sozinho.",
  },
  {
    icon: Wand2,
    title: "2. Escolha o assunto",
    body: "Você diz o tema e o tom. A equipe criativa monta capas, frases de impacto, listas e carrosséis.",
  },
  {
    icon: Download,
    title: "3. Baixe e publique",
    body: "PNG em alta (3×) para feed, story ou carrossel, com legenda pronta e cronograma da semana.",
  },
];

const FORMATS: { label: string; ratio: string; body: string; icon: typeof Images }[] = [
  {
    label: "Story",
    ratio: "9:16",
    body: "Arte vertical para stories e capas de destaque, com área segura respeitada.",
  icon: Zap,
  },
  {
    label: "Post",
    ratio: "1:1 e 4:5",
    body: "Quadrado ou retrato para o feed, com tipografia dimensionada para leitura no celular.",
    icon: Images,
  },
  {
    label: "Carrossel",
    ratio: "até 6 artes",
    body: "Capa, desenvolvimento e CTA na mesma linha visual — sequência coerente, não artes soltas.",
    icon: Layers,
  },
];

const REPERTOIRE = [
  { icon: Type, title: "Tipografia-herói", body: "Frase gigante que sustenta a arte sozinha." },
  { icon: Layers, title: "Edição mono", body: "Preto e branco adaptado com um único acento de cor." },
  { icon: Sparkles, title: "Eco tipográfico", body: "Palavra repetida em contorno com centro preenchido." },
  { icon: Images, title: "Split e retrato", body: "Sua foto dividida por painel ou emoldurada com destaque." },
  { icon: Quote, title: "Prova e citação", body: "Depoimento anonimizado com hierarquia editorial." },
  { icon: Palette, title: "Lockup de marca", body: "Wordmark vertical e assinatura em toda arte." },
];

const FAQ = [
  {
    q: "Preciso saber design?",
    a: "Não. Você escolhe o assunto e o tom; a composição, a hierarquia e o contraste são decididos pelo estúdio.",
  },
  {
    q: "As artes saem parecidas entre si?",
    a: "Não. Cada versão é montada por uma persona criativa diferente, com variações de trama, alinhamento e tratamento — mantendo a identidade da marca fixa.",
  },
  {
    q: "É vídeo?",
    a: "Não. O Studio entrega criativos estáticos em PNG de alta resolução: story, post e carrossel.",
  },
  {
    q: "Posso usar minhas fotos?",
    a: "Sim. Você sobe seu acervo, define recorte, rotação e área segura, e as artes usam a foto no melhor enquadramento.",
  },
];

const FILTERS: { id: ShowcaseFormat | "todos"; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "story", label: "Story" },
  { id: "post", label: "Post" },
  { id: "carousel", label: "Carrossel" },
];

const StudioProLanding = () => {
  const [filter, setFilter] = useState<ShowcaseFormat | "todos">("todos");

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${PRODUCT.name} — ${PRODUCT.tagline}`;
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const gallery = SHOWCASE.filter((item) => filter === "todos" || item.format === filter);

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Cabeçalho próprio do produto */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <span className="text-lg font-bold tracking-tight">{PRODUCT.wordmark}</span>
          <nav className="flex items-center gap-2">
            <a
              href="#exemplos"
              className="hidden rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Exemplos
            </a>
            <a
              href="#planos"
              className="hidden rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Planos
            </a>
            <Button asChild size="sm" className="rounded-full">
              <Link to={`${PRODUCT.base}/app`}>
                Começar grátis
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero com prova visual ao lado */}
      <section className="relative border-b border-border/60 px-5 py-16 md:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Criativos estáticos: story, post e carrossel
            </span>
            <h1 className="mt-6 text-balance text-4xl font-black leading-[1.03] tracking-tight md:text-6xl">
              Sua marca postando todo dia,{" "}
              <span className="text-primary">sem depender de designer.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg lg:mx-0">
              {PRODUCT.claim}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <Button asChild size="lg" className="w-full rounded-full sm:w-auto">
                <Link to={`${PRODUCT.base}/app`}>
                  Criar {PRODUCT.freeCredits} posts grátis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <a
                href="#exemplos"
                className="text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Ver exemplos reais
              </a>
            </div>
            <p className="mt-6 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              PNG em alta · legenda incluída · qualquer nicho
            </p>
          </div>

          {/* Trio de artes em leque */}
          <div className="relative mx-auto flex w-full max-w-md items-start gap-4 sm:max-w-lg">
            <div className="w-1/2 -rotate-2">
              <StudioProShowcase item={SHOWCASE[1]} />
            </div>
            <div className="mt-8 flex w-1/2 flex-col gap-4">
              <div className="rotate-1">
                <StudioProShowcase item={SHOWCASE[0]} />
              </div>
              <div className="-rotate-1">
                <StudioProShowcase item={SHOWCASE[6]} />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Formatos */}
      <section className="border-b border-border/60 px-5 py-14 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
            Feito para os três formatos que sustentam um perfil.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            O Studio entrega imagem estática pronta para publicar — sem edição de vídeo, sem
            template genérico, sem retrabalho de tipografia.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {FORMATS.map(({ icon: Icon, label, ratio, body }) => (
              <article key={label} className="rounded-3xl border border-border bg-card p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 flex items-baseline gap-2 text-lg font-semibold">
                  {label}
                  <span className="text-xs font-medium text-muted-foreground">{ratio}</span>
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Galeria de exemplos */}
      <section id="exemplos" className="border-b border-border/60 bg-muted/30 px-5 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Exemplos saídos do estúdio.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Nichos diferentes, mesma régua de qualidade: hierarquia clara, contraste
                intencional e uma palavra-chave carregando a mensagem.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    filter === id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-4">
            {gallery.map((item) => (
              <StudioProShowcase key={item.id} item={item} />
            ))}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Artes de demonstração com marcas fictícias, criadas pelo próprio motor do Studio.
          </p>
        </div>
      </section>

      {/* Repertório de estilos */}
      <section className="border-b border-border/60 px-5 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
            Repertório de um time, não de um template.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Cada versão é montada por uma persona criativa diferente — muda composição, trama e
            tratamento tipográfico; a identidade da sua marca continua fixa.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {REPERTOIRE.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="flex gap-4 rounded-3xl border border-border bg-card p-5"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="text-base font-semibold">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="border-b border-border/60 px-5 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
            Três passos entre a sua marca e o feed cheio.
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }) => (
              <article key={title} className="rounded-3xl border border-border bg-card p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="border-t border-border/60 bg-muted/30 px-5 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Planos</h2>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Comece com {PRODUCT.freeCredits} artes gratuitas (com marca d'água discreta). Ao assinar, o
            download sai limpo — e há créditos extras avulsos quando o mês pede mais volume.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PLANS.map((plan) => (
              <article
                key={plan.id}
                className={`flex flex-col rounded-3xl border bg-card p-6 ${plan.highlight ? "border-primary shadow-[0_18px_50px_-30px_hsl(var(--primary))]" : "border-border"}`}
              >
                <h3 className="text-lg font-bold">{plan.label}</h3>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {plan.audience}
                </p>
                <p className="mt-4 text-3xl font-black tracking-tight">
                  R$ {plan.price}
                  <span className="text-sm font-semibold text-muted-foreground">/mês</span>
                </p>
                <p className="mt-1 text-xs font-medium text-primary">
                  R$ {annualMonthlyPrice(plan.price)}/mês no plano anual (−20%)
                </p>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {plan.brands} · {plan.exports}
                </p>

                <ul className="mt-4 flex-1 space-y-2">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {perk}
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" className="mt-6 w-full rounded-full">
                  <Link to={`${PRODUCT.base}/app`}>Testar</Link>
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Perguntas */}
      <section className="border-t border-border/60 px-5 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Perguntas diretas</h2>
          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="rounded-3xl border border-border bg-card p-5">
                <dt className="text-base font-semibold">{q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-10 flex flex-col items-center gap-3 rounded-3xl border border-primary/40 bg-primary/5 p-8 text-center">
            <h3 className="text-2xl font-black tracking-tight">
              Comece com {PRODUCT.freeCredits} artes por conta da casa.
            </h3>
            <Button asChild size="lg" className="rounded-full">
              <Link to={`${PRODUCT.base}/app`}>
                Abrir meu estúdio
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
          <span className="font-semibold text-foreground">{PRODUCT.wordmark}</span>
          <span>{PRODUCT.tagline}</span>
        </div>
      </footer>
    </main>
  );
};

export default StudioProLanding;
