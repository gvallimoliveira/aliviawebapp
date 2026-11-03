import { describe, it, expect } from "vitest";
import { structureBlogContent, availableBlogIntents, BLOG_INTENTS, relatedBlogPosts } from "@/lib/blogStructure";

describe("blog presentation preserves authored content", () => {
  it("preserves all authored text and existing links when adding section anchors", () => {
    const content = '<p>Texto original com <strong>ênfase</strong>.</p><h2>Metas clínicas</h2><p>Sem promessa de renda.</p><a href="/profissionais">Conhecer PRO</a>';
    const original = new DOMParser().parseFromString(content, "text/html");
    const result = structureBlogContent(content);
    expect(result.text).toBe(original.body.textContent);
    expect(new DOMParser().parseFromString(result.html, "text/html").querySelector("a")?.getAttribute("href")).toBe("/profissionais");
  });
  it("preserves existing anchors and avoids generated collisions", () => {
    const result = structureBlogContent('<p id="secao-1">Intro</p><h2>Meta</h2><h3 id="original">Força</h3>');
    expect(result.sections.map(section => section.id)).toEqual(["secao-1-2", "original"]);
  });
  it("never links search intents to articles missing from the published list", () => {
    expect(availableBlogIntents([{ slug: BLOG_INTENTS[0].slug }]).map(p => p.slug)).toEqual([BLOG_INTENTS[0].slug]);
    expect(availableBlogIntents([])).toEqual([]);
  });
  it("excludes the current article and unrelated articles", () => {
    const post = { slug: "current", tags: ["Fisioterapia"] };
    expect(relatedBlogPosts(post, [post, { slug: "related", tags: ["fisioterapia"] }, { slug: "other", tags: ["outro"] }]).map(p => p.slug)).toEqual(["related"]);
  });
});