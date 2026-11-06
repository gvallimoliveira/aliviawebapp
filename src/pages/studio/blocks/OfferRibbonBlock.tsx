import { Tag, Timer } from "lucide-react";
import { BRAND_HANDLE } from "../brand";
import { blockPadding, sectionHeight, type BlockProps } from "./shared";
import { pickCoherentSupport } from "./shared";
import { joinCopyParts } from "../typographyGuards";

/** A reference supplies composition, never its discount or deadline. */
const OfferRibbonBlock = ({ content, rng, treatment, format }: BlockProps) => {
  const offers = content.sales.offers.filter((line) => line.trim());
  const closings = content.closings.filter((line) => line.cta.trim());
  if (!offers.length || !content.headlines.length || !closings.length) return null;
  const headline = rng.pick(content.headlines);
  const title = joinCopyParts(headline.strong, headline.rest);
  const offer = pickCoherentSupport(rng, offers, title) || rng.pick(offers);
  const closing = rng.pick(closings);
  const ribbon = content.kickers.find((line) => line.trim()) || content.label;
  // A stopwatch only accompanies an explicitly declared duration, not invented urgency.
  const timed = /\b(?:até|por tempo limitado|durante|válid[oa] por)\b/i.test(offer);
  const Symbol = timed ? Timer : Tag;
  const dark = treatment !== 1;
  const longest = title.split(/\s+/).reduce((max, word) => Math.max(max, word.length), 0);
  const titleSize = longest > 13 || title.length > 100 ? "text-2xl" : title.length > 55 ? "text-3xl" : "text-4xl";

  return (
    <section className={`relative flex ${sectionHeight(format)} flex-col ${dark ? "bg-foreground text-background" : "bg-background text-foreground"}`}>
      <div aria-hidden="true" className="pointer-events-none relative h-[19%] shrink-0 overflow-hidden">
        <div className="absolute -left-[5%] top-[38%] h-7 w-[110%] rotate-[10deg] bg-accent/40" />
        <div className="absolute -left-[5%] top-[38%] h-8 w-[110%] -rotate-[7deg] bg-primary" />
        <p className="absolute inset-x-[8%] top-[38%] py-2 text-center text-xs font-bold uppercase leading-tight text-primary-foreground">{ribbon}</p>
      </div>
      <div className={`relative flex min-h-0 flex-1 flex-col justify-center gap-5 ${blockPadding(format)} !pt-4`}>
        <h2 className={`break-words text-center ${titleSize} font-extrabold uppercase leading-[1.05] [overflow-wrap:anywhere]`}>
          <span className="block">{headline.strong}</span>
          {headline.rest && <span className="block">{headline.rest}</span>}
        </h2>
        <div className="flex items-center gap-3" data-studio-fit-visual="1">
          <Symbol aria-hidden="true" className={`h-16 w-16 shrink-0 ${dark ? "text-background" : "text-foreground"}`} strokeWidth={1.5} />
          <p className={`min-w-0 flex-1 break-words rounded-lg px-4 py-4 text-center text-xl font-extrabold leading-tight [overflow-wrap:anywhere] ${dark ? "bg-background text-foreground" : "bg-primary text-primary-foreground"}`}>{offer}</p>
        </div>
        <p className="break-words text-center text-sm font-bold uppercase leading-snug">{closing.cta}</p>
        {BRAND_HANDLE && <p className="text-center text-xs leading-normal">{BRAND_HANDLE}</p>}
      </div>
    </section>
  );
};

export default OfferRibbonBlock;