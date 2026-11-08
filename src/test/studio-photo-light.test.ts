import { describe, it, expect } from 'vitest';
import { applyPhotoShade, photoLightValues, readPhotoShade } from '@/pages/studio/photoLight';
import { freezeMotion } from '@/pages/studio/exportImage';
describe('background photo light', () => {
  it('export motion freezing preserves an intentionally invisible film', () => {
    const node = document.createElement('div');
    node.innerHTML = '<div data-studio-overlay="1" style="opacity:0"></div><div id="reveal" style="opacity:0"></div>';
    const restore = freezeMotion(node);
    expect(node.querySelector<HTMLElement>('[data-studio-overlay]')?.style.opacity).toBe('0');
    expect(node.querySelector<HTMLElement>('#reveal')?.style.opacity).toBe('1');
    restore();
  });
  it('zero removes both the film and image darkening', () => {
    const node = document.createElement('div');
    node.innerHTML = '<section data-studio-photo-background="1"><img data-studio-photo="1"><div data-studio-overlay="1"></div></section>';
    applyPhotoShade(node, 0);
    expect(node.querySelector<HTMLElement>('[data-studio-overlay]')?.style.opacity).toBe('0');
    expect(node.querySelector('img')?.style.filter).toBe('brightness(1) saturate(1) contrast(1)');
    expect(node.querySelector('img')?.style.opacity).toBe('1');
  });
  it('missing values retain the existing full treatment and midpoint is proportional', () => {
    expect(photoLightValues().brightness).toBeCloseTo(0.82);
    expect(photoLightValues().amount).toBe(1);
    expect(photoLightValues().opacity).toBe(0.9);
    expect(photoLightValues(50).brightness).toBeCloseTo(0.91);
    expect(photoLightValues(50).amount).toBe(0.5);
  });
  it('saves zero in the DOM and reads it after serialization without changing other images', () => {
    const node = document.createElement('div');
    node.innerHTML = '<img id="logo"><section data-studio-photo-background="1"><img data-studio-photo="1"></section>';
    applyPhotoShade(node, 0);
    const loaded = document.createElement('div'); loaded.innerHTML = node.innerHTML;
    expect(readPhotoShade(loaded)).toBe(0);
    expect(loaded.querySelector<HTMLImageElement>('#logo')?.style.filter).toBe('');
  });
});