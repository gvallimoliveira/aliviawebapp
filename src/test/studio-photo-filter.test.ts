import { describe, expect, it } from 'vitest';
import { applyPhotoFilterPixels } from '@/pages/studio/photoFilter';
describe('Safari photo filtering', () => {
  it('retains natural RGB and alpha at zero darkening', () => {
    const pixels = new Uint8ClampedArray([160,180,200,255]);
    applyPhotoFilterPixels(pixels, 'brightness(1) saturate(1) contrast(1)');
    expect([...pixels]).toEqual([160,180,200,255]);
  });
  it('applies the full inserted-background darkening without tinting', () => {
    const pixels = new Uint8ClampedArray([160,180,200,255]);
    applyPhotoFilterPixels(pixels, 'brightness(0.42) saturate(1) contrast(1)');
    expect([...pixels]).toEqual([67,76,84,255]);
  });
  it('respects ordered CSS filters rather than skipping unsupported canvas filters', () => {
    const pixels = new Uint8ClampedArray([100,150,200,128]);
    applyPhotoFilterPixels(pixels, 'brightness(50%) invert(1)');
    expect([...pixels]).toEqual([205,180,155,128]);
  });
});