/**
 * Erkennung des eigenen Personenblocks mit den Nachbarblöcken als zusätzlichen Beispielen
 * (PRD Dienstplan-Import: Muster aus der ganzen Tabelle). Übernommen wird nur der eigene Block.
 */
import { Quad, buildGrid, neighborBlocks, quadSlice, warpQuad } from './geometry';
import { OcrEngine } from './ocr';
import { Raster } from './raster';
import { GridLayout, PersonResult, RecognitionOptions, Vocabulary, recognizeGrid } from './recognizeGrid';

export interface OwnBlockOptions extends Omit<RecognitionOptions, 'auxiliaryPersons'> {
  neighbors?: number;   // höchstens so viele Blöcke darüber und darunter (Standard 1)
}

export async function recognizeOwnBlock(image: Raster, corners: Quad, days: number, layout: Omit<GridLayout, 'persons'>,
                                        vocabulary: Vocabulary, engine: OcrEngine, options: OwnBlockOptions = {}): Promise<PersonResult> {
  const { neighbors = 1, ...recognition } = options;
  const { above, below } = neighborBlocks(image, corners, neighbors);
  const persons = 1 + above + below;
  const region = quadSlice(corners, -above, 1 + below);
  const grid = buildGrid(warpQuad(image, region, days * 64, persons * layout.subRows * 34), days, persons * layout.subRows);
  const auxiliaryPersons = Array.from({ length: persons }, (_, p) => p).filter(p => p !== above);
  const results = await recognizeGrid(grid, { ...layout, persons }, vocabulary, engine, { ...recognition, auxiliaryPersons });
  return results[above];
}
