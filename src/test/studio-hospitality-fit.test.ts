import { describe, it, expect } from 'vitest';
import { buildBrandDna, offerWords, operationWords } from '@/pages/studio-pro/brandDnaKit';
import { isSoftwareProduct } from '@/pages/studio-pro/productFocus';
import { buildSegmentContent } from '@/pages/studio-pro/brandContent';
import { planBatch } from '@/pages/studio-pro/director';
import { relationForSegment } from '@/pages/studio-pro/brandContent';
import type { BrandAudience } from '@/pages/studio-pro/audiences';
const kit = { name: 'Casa Horizonte', niche: 'Hospedagem Airbnb', description: 'Casa de temporada. Aplicativo Airbnb para reservas.', briefAnswers: { oferta: 'Locação de casa inteira por temporada', apresentacao: 'Casa com vista para o mar' } };
const dna = buildBrandDna({ ...kit, briefAnswers: kit.briefAnswers });
const themes: BrandAudience[] = [
  { id: 'tema-4', label: 'Área de lazer', editorialGroup: 'Temas', keyword: 'Piscina', highlightTerms: ['Piscina', 'Sauna'], proof: ['Piscina privativa com vista para o mar', 'Sauna envidraçada junto à piscina'], desires: ['Relaxar junto ao mar'], cta: 'Consulte as datas' },
  { id: 'tema-5', label: 'Interna da casa', editorialGroup: 'Temas', keyword: 'Conforto', proof: ['5 quartos', 'Cozinha completa'], cta: 'Conheça a casa' },
];
describe('business-compatible hospitality', () => {
  it('a booking app mention does not turn lodging into software', () => {
    expect(isSoftwareProduct(dna)).toBe(false);
    expect(offerWords(dna).kind).toBe('hospedagem');
    expect(operationWords(dna).whoPlural).toBe('hóspedes');
  });
  it('preserves the two themes and only uses facts of the selected theme throughout direction', () => {
    const content = buildSegmentContent({ kit, audiences: themes, segment: 'tema-4', angle: 'informar', variationSeed: 'lodging' });
    const relation = relationForSegment({ kit, audiences: themes, segment: 'tema-4', angle: 'informar' });
    const direction = planBatch({ content, count: 10, seed: 'lodging', dna, relation });
    const output = JSON.stringify(Array.from({ length: 10 }, (_, i) => direction.contentFor(i)));
    expect(output).toContain('Piscina privativa');
    expect(output).not.toMatch(/Cozinha completa|5 quartos|resultado final|onboarding|paciente|entrega sem custo|primeiro teste/);
    expect(themes.map((t) => t.id)).toEqual(['tema-4', 'tema-5']);
  });
});