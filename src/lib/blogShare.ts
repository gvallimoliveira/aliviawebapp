/** Pure helpers for blog sharing and reading time. */
export const estimateReadingMinutes = (html: string | null | undefined): number => {
  const words = (html || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
};

export const buildShareLinks = (url: string, title: string) => {
  const u = encodeURIComponent(url);
  const text = encodeURIComponent(`${title} — ${url}`);
  return {
    whatsapp: `https://wa.me/?text=${text}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
  };
};
