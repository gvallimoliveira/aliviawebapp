const SITE_URL = "https://aliviawebapp.com.br";
const SITE_NAME = "Aliv.iA";
const DEFAULT_IMAGE = `${SITE_URL}/__l5e/assets-v1/654b9831-689b-42de-9c8a-db4280be2c44/alivia-social-logo.jpg`;
const LOGO = `${SITE_URL}/favicon.png`;

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

// Schemas stack: setSeo() clears them once per page, each helper appends one.
function addJsonLd(data: Record<string, unknown>) {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.setAttribute("data-seo", "jsonld");
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

export function setSeo({ title, description, url, image, type = "website", publishedAt, author, tags }: SeoParams) {
  removeJsonLd();
  document.querySelectorAll('meta[property^="article:"]').forEach(el => el.remove());
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
  language?: string;
  articleBody?: string;
  sections?: { id: string; title: string }[];
}) {
  addJsonLd({
    "@context": "https://schema.org",
    "@graph": [{
    "@type": "BlogPosting",
    "@id": `${post.url}#article`,
    headline: post.title,
    description: post.description,
    url: post.url,
    image: post.image || undefined,
    datePublished: post.publishedAt,
    author: {
      "@type": post.author === SITE_NAME ? "Organization" : "Person",
      name: post.author,
      ...(post.author === SITE_NAME ? { url: SITE_URL } : {}),
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    keywords: post.tags?.join(", "),
    inLanguage: post.language || "pt-BR",
    articleBody: post.articleBody,
    hasPart: post.sections?.map(section => ({
      "@type": "WebPageElement", "@id": `${post.url}#${section.id}`,
      name: section.title, url: `${post.url}#${section.id}`,
    })),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": post.url,
    },
    }, {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: post.url },
      ],
    }],
  });
}

export function setOrganizationJsonLd() {
  addJsonLd({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: LOGO,
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
    logo: LOGO,
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

export function setSoftwareJsonLd(p: { name: string; url: string; description: string; audience: string; features: string[]; price?: string }) {
  addJsonLd({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: p.name,
    url: p.url,
    description: p.description,
    applicationCategory: "HealthApplication",
    applicationSubCategory: "Fisioterapia",
    operatingSystem: "Web, iOS, Android (PWA)",
    inLanguage: ["pt-BR", "en", "es"],
    audience: { "@type": "Audience", audienceType: p.audience },
    featureList: p.features,
    ...(p.price ? { offers: { "@type": "Offer", price: p.price, priceCurrency: "BRL" } } : {}),
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  });
}

/** Top musculoskeletal pain complaints searched in Brazil (patient landing SEO/GEO). */
export const PAIN_CONDITIONS = [
  { name: "Dor lombar (lombalgia)", alt: ["dor nas costas", "coluna travada"] },
  { name: "Dor ciática (ciatalgia)", alt: ["nervo ciático", "dor que desce pela perna"] },
  { name: "Dor cervical (cervicalgia)", alt: ["dor no pescoço", "torcicolo"] },
  { name: "Dor no joelho", alt: ["condromalácia", "menisco", "artrose no joelho"] },
  { name: "Dor no ombro", alt: ["bursite no ombro", "tendinite do manguito rotador"] },
  { name: "Dor no quadril", alt: ["bursite trocantérica", "dor na virilha"] },
  { name: "Fascite plantar", alt: ["dor no calcanhar", "esporão"] },
  { name: "Dor nas costas torácica (dorsalgia)", alt: ["dor entre as escápulas", "meio das costas"] },
  { name: "Dor no punho e na mão", alt: ["tendinite de De Quervain", "LER/DORT", "túnel do carpo"] },
  { name: "Dor crônica", alt: ["dor persistente há mais de 3 meses", "dores difusas"] },
];

export function setPatientHealthJsonLd(url: string) {
  addJsonLd({
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: "Autoavaliação de dor e fisioterapia online",
    url,
    inLanguage: "pt-BR",
    audience: { "@type": "PeopleAudience", audienceType: "Pessoas com dor musculoesquelética" },
    specialty: "Physiotherapy",
    about: PAIN_CONDITIONS.map((c) => ({ "@type": "MedicalCondition", name: c.name, alternateName: c.alt })),
    mainEntity: {
      "@type": "WebApplication",
      name: "Autoavaliação de dor Aliv.iA",
      applicationCategory: "HealthApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "BRL", description: "Avaliação básica gratuita" },
    },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  });
}

export const SEO_CONSTANTS = { SITE_URL, SITE_NAME, DEFAULT_IMAGE };
