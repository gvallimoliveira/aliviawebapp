const SITE_URL = "https://aliviawebapp.com.br";
const SITE_NAME = "Aliv.iA";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

interface SeoParams {
  title: string;
  description: string;
  url?: string;
  image?: string;
  type?: string;
  publishedAt?: string;
  author?: string;
  tags?: string[];
}

function setMetaTag(property: string, content: string, isOg = true) {
  const attr = isOg ? "property" : "name";
  let el = document.querySelector(`meta[${attr}="${property}"]`);
  if (el) {
    el.setAttribute("content", content);
  } else {
    el = document.createElement("meta");
    el.setAttribute(attr, property);
    el.setAttribute("content", content);
    document.head.appendChild(el);
  }
}

function removeJsonLd() {
  document.querySelectorAll('script[data-seo="jsonld"]').forEach((el) => el.remove());
}

function addJsonLd(data: Record<string, unknown>) {
  removeJsonLd();
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.setAttribute("data-seo", "jsonld");
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

export function setSeo({ title, description, url, image, type = "website", publishedAt, author, tags }: SeoParams) {
  document.title = title;

  // Canonical tag
  const canonicalUrl = url || SITE_URL;
  let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (canonicalEl) {
    canonicalEl.href = canonicalUrl;
  } else {
    canonicalEl = document.createElement("link");
    canonicalEl.rel = "canonical";
    canonicalEl.href = canonicalUrl;
    document.head.appendChild(canonicalEl);
  }

  setMetaTag("description", description, false);
  setMetaTag("og:title", title);
  setMetaTag("og:description", description);
  setMetaTag("og:type", type);
  setMetaTag("og:url", canonicalUrl);
  setMetaTag("og:image", image || DEFAULT_IMAGE);
  setMetaTag("og:site_name", SITE_NAME);
  setMetaTag("twitter:card", "summary_large_image", false);
  setMetaTag("twitter:title", title, false);
  setMetaTag("twitter:description", description, false);
  setMetaTag("twitter:image", image || DEFAULT_IMAGE, false);

  if (type === "article" && publishedAt) {
    setMetaTag("article:published_time", publishedAt);
    if (author) setMetaTag("article:author", author);
    tags?.forEach((tag, i) => setMetaTag(`article:tag:${i}`, tag));
  }
}

export function setLandingJsonLd() {
  addJsonLd({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: SITE_URL,
    description: "Avaliação musculoesquelética com inteligência artificial. Diagnóstico preliminar e plano de tratamento personalizado.",
    applicationCategory: "HealthApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
      description: "Avaliação básica gratuita",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "1600",
      bestRating: "5",
    },
    creator: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  });
}

export function setBlogListJsonLd(posts: { title: string; url: string; image?: string; date?: string }[]) {
  addJsonLd({
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${SITE_NAME} Blog`,
    url: `${SITE_URL}/blog`,
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: p.url,
      image: p.image || DEFAULT_IMAGE,
      datePublished: p.date,
    })),
  });
}

export function setBlogPostJsonLd(post: {
  title: string;
  description: string;
  url: string;
  image?: string;
  publishedAt?: string;
  author: string;
  tags?: string[];
}) {
  addJsonLd({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    url: post.url,
    image: post.image || DEFAULT_IMAGE,
    datePublished: post.publishedAt,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    keywords: post.tags?.join(", "),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": post.url,
    },
  });
}

export function setOrganizationJsonLd() {
  addJsonLd({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/og-image.png`,
    sameAs: [
      "https://www.instagram.com/alivia.fisioapp",
      "https://instagram.com/gvallim.fisioterapia",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      availableLanguage: ["Portuguese", "English", "Spanish"],
    },
  });
}

export function setMedicalBusinessJsonLd() {
  addJsonLd({
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/og-image.png`,
    description:
      "Avaliação musculoesquelética com inteligência artificial. Diagnóstico preliminar e plano de tratamento personalizado em minutos.",
    medicalSpecialty: "Musculoskeletal",
    availableService: {
      "@type": "MedicalTherapy",
      name: "Avaliação de Dor com IA",
      description:
        "Diagnóstico preliminar baseado em evidência científica com plano de tratamento personalizado.",
    },
    areaServed: {
      "@type": "Country",
      name: "Brazil",
    },
  });
}

export function setFAQPageJsonLd(faqs: { question: string; answer: string }[]) {
  addJsonLd({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  });
}

export const SEO_CONSTANTS = { SITE_URL, SITE_NAME, DEFAULT_IMAGE };
