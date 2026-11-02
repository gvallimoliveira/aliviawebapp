import { describe, it, expect, vi } from 'vitest';
import { photoDimensions, preparePhoto } from '../lib/preparePhoto';
describe('photo preparation', () => {
  it('bounds record photos without changing aspect ratio', () => {
    expect(photoDimensions(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(photoDimensions(800, 1200)).toEqual({ width: 800, height: 1200 });
  });
  it('keeps Studio HD dimension separate', () => {
    expect(photoDimensions(3000, 4000, 2400)).toEqual({ width: 1800, height: 2400 });
  });
  it('never converts a PDF', async () => {
    const file = new File(['original'], 'exam.pdf', { type: 'application/pdf' });
    expect(await preparePhoto(file)).toBe(file);
  });
  it('keeps original on decoding failure', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode')));
    const file = new File(['original'], 'photo.png', { type: 'image/png' });
    expect(await preparePhoto(file)).toBe(file);
    vi.unstubAllGlobals();
  });
});