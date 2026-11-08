import { describe, expect, it } from 'vitest';
import { buildBrandDna } from '@/pages/studio-pro/brandDnaKit';
import { buildSegmentContent, relationForSegment } from '@/pages/studio-pro/brandContent';
import { planBatch } from '@/pages/studio-pro/director';
import { hookSignature } from '@/pages/studio/picker';
import { commercialAudienceHooks } from '@/pages/studio-pro/commercialPriority';
import { hookKey, saveHookPrefs } from '@/pages/studio/hookStore';
import type { BrandAudience } from '@/pages/studio-pro/audiences';

const kit = { name: 'Casa Teste Rotação', niche: 'Hospedagem Airbnb', description: 'Casa de temporada', briefAnswers: { oferta: 'Locação da casa por temporada' } };
const theme: BrandAudience = { id: 'lazer', label: 'Área de lazer', editorialGroup: 'Temas', keyword: 'Piscina', proof: ['Piscina privativa com vista para o mar'], hooks: Array.from({ length: 60 }, (_, i) => `Aproveite a piscina no seu momento de descanso ${i + 1}`), cta: 'Consulte as datas' };
const other: BrandAudience = { id: 'interna', label: 'Interna da casa', editorialGroup: 'Temas', keyword: 'Quartos', hooks: ['Cinco quartos para reunir sua família'], proof: ['Cozinha completa'] };
const dna = buildBrandDna(kit);
const build = () => buildSegmentContent({ kit, audiences: [theme, other], segment: theme.id, angle: 'informar', variationSeed: 'rotation' });
const relation = relationForSegment({ kit, audiences: [theme, other], segment: theme.id, angle: 'informar' });

describe('brand hook repertoire rotation', () => {
  it('preserves all 60 active theme hooks instead of replacing them with a few stay facts', () => {
    expect(build().hooks?.map(h => h.strong)).toEqual(commercialAudienceHooks([theme], dna).map(h => h.strong));
    expect(build().hooks).toHaveLength(60);
    expect(JSON.stringify(build().hooks)).not.toMatch(/quartos|Cozinha/);
  });
  it('circulates all 60 hooks before repeating across ten six-art batches', () => {
    const content = build();
    const uses = new Map<string, number>();
    const seen: string[] = [];
    for (let batch = 0; batch < 10; batch++) {
      const direction = planBatch({ content, count: 6, seed: `batch-${batch}`, dna, relation, weightOf: sig => 1 / (1 + (uses.get(sig) ?? 0)) });
      for (let i = 0; i < 6; i++) {
        const hook = direction.contentFor(i).hooks?.[0];
        expect(hook).toBeDefined();
        if (!hook) throw new Error('missing hook');
        const sig = hookSignature(hook);
        expect(direction.shots[i].hookSignatures).toEqual([sig]);
        expect(direction.contentFor(i).headlines[0].strong).toContain(hook.strong);
        seen.push(sig); uses.set(sig, (uses.get(sig) ?? 0) + 1);
      }
    }
    expect(new Set(seen).size).toBe(60);
  });
  it('retains deterministic choices for the same seed and history', () => {
    const input = { content: build(), count: 6, seed: 'stable', dna, relation, weightOf: () => 0.5 };
    expect(planBatch(input).shots).toEqual(planBatch(input).shots);
  });
  it('honors disabled hooks after hospitality focusing', () => {
    const first = commercialAudienceHooks([theme], dna)[0];
    saveHookPrefs(kit.name, { off: [hookKey(first)], order: [] });
    try { expect(build().hooks?.some(h => hookKey(h) === hookKey(first))).toBe(false); }
    finally { saveHookPrefs(kit.name, { off: [], order: [] }); }
  });
});