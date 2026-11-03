import { useState } from "react";
import { Check, Linkedin, Link2, MessageCircle, Share2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { buildShareLinks } from "@/lib/blogShare";

const COPY = {
  pt: { label: "Compartilhar", copy: "Copiar link", copied: "Link copiado", more: "Mais opções" },
  en: { label: "Share", copy: "Copy link", copied: "Link copied", more: "More options" },
  es: { label: "Compartir", copy: "Copiar enlace", copied: "Enlace copiado", more: "Más opciones" },
};

const btn = "inline-flex h-9 items-center gap-1.5 rounded-full border border-border/70 px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary";

const BlogShareBar = ({ url, title, className = "" }: { url: string; title: string; className?: string }) => {
  const { language } = useLanguage();
  const c = COPY[language as keyof typeof COPY] ?? COPY.pt;
  const [copied, setCopied] = useState(false);
  const links = buildShareLinks(url, title);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} aria-label={c.label}>
      <span className="mr-1 text-xs text-muted-foreground">{c.label}:</span>
      <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className={btn} aria-label="WhatsApp">
        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
      </a>
      <a href={links.linkedin} target="_blank" rel="noopener noreferrer" className={btn} aria-label="LinkedIn">
        <Linkedin className="h-3.5 w-3.5" /> LinkedIn
      </a>
      <button type="button" onClick={copy} className={btn}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />} {copied ? c.copied : c.copy}
      </button>
      {canNativeShare && (
        <button type="button" onClick={() => navigator.share({ title, url }).catch(() => {})} className={btn} aria-label={c.more}>
          <Share2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

export default BlogShareBar;
