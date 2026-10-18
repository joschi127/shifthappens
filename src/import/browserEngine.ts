/**
 * Texterkennung im Browser: tesseract.js wird erst bei Bedarf geladen, alle Dateien kommen
 * aus public/tesseract/ (selbst ausgeliefert, vom Service Worker beim ersten Einsatz gecacht).
 */
import { OcrEngine } from './ocr';
import { rasterToCanvas } from './imageInput';

let engine: Promise<OcrEngine> | null = null;

export function getBrowserEngine(): Promise<OcrEngine> {
  if (!engine) {
    const base = new URL(`${import.meta.env.BASE_URL}tesseract/`, window.location.origin).href;
    engine = import('./tesseractEngine').then(({ createTesseractEngine }) => createTesseractEngine({
      encode: rasterToCanvas,
      workerPath: `${base}worker.min.js`,
      corePath: `${base}core/`,
      langPath: `${base}lang`,
      cacheMethod: 'write'
    })).catch(error => { engine = null; throw error; });
  }
  return engine;
}

export async function releaseBrowserEngine(): Promise<void> {
  const current = engine;
  engine = null;
  await (await current)?.terminate();
}
