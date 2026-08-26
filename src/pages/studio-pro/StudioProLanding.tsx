import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Palette, Sparkles, Wand2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS, PRODUCT } from "./product";

/**
 * LANDING DO STUDIO PÚBLICO
 *
 * Shell isolado: nenhum link, logo ou menção ao app clínico. Quem cai aqui vê
 * apenas um produto de criação de conteúdo para qualquer nicho.
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
    icon: Zap,
    title: "3. Baixe e publique",
    body: "PNG em feed, story ou carrossel, com legenda pronta e cronograma sugerido da semana.",
  },
];

const StudioProLanding = () => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${PRODUCT.name} — ${PRODUCT.tagline}`;
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Cabeçalho próprio do produto */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <span className="text-lg font-bold tracking-tight">{PRODUCT.wordmark}</span>
          <nav className="flex items-center gap-2">
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

      {/* Hero */}
      <section className="relative border-b border-border/60 px-5 py-20 md:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Design editorial automático
          </span>
          <h1 className="mt-6 text-balance text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
            Sua marca postando todo dia,{" "}
            <span className="text-primary">sem depender de designer.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            {PRODUCT.claim}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full rounded-full sm:w-auto">
              <Link to={`${PRODUCT.base}/app`}>
                Criar meus primeiros posts
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <a
              href="#como-funciona"
              className="text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Ver como funciona
            </a>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="px-5 py-16 md:py-24">
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
            Assinatura mensal por marca, com créditos extras avulsos quando o mês pede mais volume.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PLANS.map((plan) => (
              <article
                key={plan.id}
                className="flex flex-col rounded-3xl border border-border bg-card p-6"
              >
                <h3 className="text-lg font-bold">{plan.label}</h3>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {plan.audience}
                </p>
                <p className="mt-4 text-sm font-semibold">
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
