import { describe, expect, it } from 'vitest';
import { cleanHospitalityCopy, hospitalityDisplayTerms, hospitalityFacts } from '@/pages/studio-pro/hospitalityContent';
import { buildBrandDna } from '@/pages/studio-pro/brandDnaKit';
import { studioSiteLabel } from '@/pages/studio/brand';

describe('hospitality subject selection', () => {
  it('highlights the bedding subject rather than inclusas or acomodar', () => {
    expect(hospitalityDisplayTerms({ title: 'Cinco quartos com toleras e roupas da cama inclusas para acomodar a família.', description: '' }))
      .toEqual(['Roupa de cama e banho']);
  });
  it('uses quartos rather than the accommodation verb', () => {
    expect(hospitalityDisplayTerms({ title: 'Cinco quartos para acomodar a família.', description: '' })).toEqual(['Quartos']);
  });
  it('repairs the supplied linen spelling without rewriting facts', () => {
    expect(cleanHospitalityCopy('Cinco quartos com toleras e roupas da cama inclusas para acomodar a família.'))
      .toBe('Cinco quartos com toalhas e roupas de cama inclusas para acomodar a família.');
  });
  it('never promotes booking links into stay facts or supporting arguments', () => {
    const dna = buildBrandDna({ name: 'Casa', niche: 'Hospedagem', briefAnswers: { oferta: 'Casa inteira com cinco quartos', apresentacao: 'https://www.airbnb.com.br/rooms/16286879?utm_source=ig&fbclid=tracking' } });
    expect(hospitalityFacts(dna)).toEqual([{ title: 'Casa inteira com cinco quartos', description: '' }]);
  });
  it('preserves the booking destination label without tracking parameters', () => {
    expect(studioSiteLabel('https://www.airbnb.com.br/rooms/16286879?utm_source=ig&fbclid=tracking'))
      .toBe('www.airbnb.com.br/rooms/16286879');
  });
});