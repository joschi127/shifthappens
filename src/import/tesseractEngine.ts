/**
 * OcrEngine auf Basis von tesseract.js. Zwei Worker: einer für Einzelzellen (eine Textzeile),
 * einer für verstreuten Text (Streifen, ganzes Bild). Parameter werden nur bei Änderung gesetzt.
 */
import { createWorker, OEM, PSM } from 'tesseract.js';
import type { Worker } from 'tesseract.js';
import { OcrEngine, OcrRequest, OcrWord } from './ocr';
import { Raster } from './raster';

// Wandelt ein Rasterbild in etwas, das tesseract.js lesen kann (Browser: Canvas, Node: PNG-Buffer)
export type ImageEncoder = (image: Raster) => unknown;

export interface TesseractEngineOptions {
  encode: ImageEncoder;
  // Pfade für selbst ausgelieferte Dateien (Browser) bzw. lokale Sprachdaten (Node)
  workerPath?: string;
  corePath?: string;
  langPath?: string;
  cacheMethod?: 'write' | 'readOnly' | 'refresh' | 'none';
}

interface WorkerState { worker: Worker; psm?: PSM; characters?: string }

export async function createTesseractEngine(options: TesseractEngineOptions): Promise<OcrEngine> {
  const workerOptions = {
    ...(options.workerPath ? { workerPath: options.workerPath } : {}),
    ...(options.corePath ? { corePath: options.corePath } : {}),
    ...(options.langPath ? { langPath: options.langPath } : {}),
    ...(options.cacheMethod ? { cacheMethod: options.cacheMethod } : {}),
    gzip: true
  };
  const line: WorkerState = { worker: await createWorker('eng', OEM.LSTM_ONLY, workerOptions) };
  const sparse: WorkerState = { worker: await createWorker('eng', OEM.LSTM_ONLY, workerOptions) };

  const configure = async (state: WorkerState, psm: PSM, characters: string) => {
    if (state.psm === psm && state.characters === characters) return;
    await state.worker.setParameters({ tessedit_pageseg_mode: psm, tessedit_char_whitelist: characters });
    state.psm = psm; state.characters = characters;
  };

  return {
    async recognize(image: Raster, request: OcrRequest) {
      const state = request.mode === 'line' ? line : sparse;
      await configure(state, request.mode === 'line' ? PSM.SINGLE_LINE : PSM.SPARSE_TEXT, request.characters ?? '');
      const { data } = await state.worker.recognize(options.encode(image) as never, {}, { blocks: true });
      const words: OcrWord[] = (data.blocks ?? []).flatMap(b => b.paragraphs.flatMap(p => p.lines.flatMap(l => l.words)))
        .map(w => ({ text: w.text, x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 }));
      return { text: data.text, words };
    },
    async terminate() {
      await Promise.all([line.worker.terminate(), sparse.worker.terminate()]);
    }
  };
}
