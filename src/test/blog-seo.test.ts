import { describe, it, expect } from "vitest";
import { setBlogPostJsonLd, setSeo } from "@/lib/seo";

describe("article structured data", () => {
  it("identifies the institutional author without inventing review dates or a cover", () => {
    setBlogPostJsonLd({ title: "Título original", description: "Resumo", url: "https://aliviawebapp.com.br/blog/original", author: "Aliv.iA", language: "pt-BR", articleBody: "Texto original", sections: [{ id: "secao-1", title: "Meta" }] });
    const data = JSON.parse(document.querySelector('script[data-seo="jsonld"]')?.textContent || "{}");
    const article = data["@graph"][0];
    expect(article.author["@type"]).toBe("Organization");
    expect(article.articleBody).toBe("Texto original");
    expect(article.dateModified).toBeUndefined();
    expect(article.image).toBeUndefined();
    expect(article.hasPart[0].url).toBe("https://aliviawebapp.com.br/blog/original#secao-1");
  });
  it("removes previous article metadata when navigating away", () => {
    setSeo({ title: "Article", description: "Original", type: "article", publishedAt: "2026-01-01", tags: ["tag"] });
    setBlogPostJsonLd({ title: "Article", description: "Original", url: "https://aliviawebapp.com.br/blog/a", author: "Aliv.iA" });
    setSeo({ title: "Blog", description: "List" });
    expect(document.querySelector('meta[property="article:published_time"]')).toBeNull();
    expect(document.querySelector('script[data-seo="jsonld"]')).toBeNull();
  });
});