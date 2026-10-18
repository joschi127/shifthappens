/**
 * Schnittstelle zur Texterkennung. Die Erkennungslogik kennt nur diese Schnittstelle;
 * in der App und in den Tests steckt tesseract.js dahinter (tesseractEngine.ts).
 */
import { Raster } from './raster';

export interface OcrWord {
  text: string;
  x0: number; y0: number; x1: number; y1: number;
}

export interface OcrRequest {
  mode: 'line' | 'sparse';  // eine Textzeile (Einzelzelle) bzw. verstreuter Text (Streifen, ganzes Bild)
  characters?: string;       // erlaubte Zeichen; leer/undefined = alle
}

export interface OcrEngine {
  recognize(image: Raster, request: OcrRequest): Promise<{ text: string; words: OcrWord[] }>;
  terminate(): Promise<void>;
}
