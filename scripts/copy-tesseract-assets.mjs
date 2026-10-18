// Kopiert die Dateien für die Texterkennung (tesseract.js) nach public/tesseract/, damit sie
// selbst ausgeliefert werden (offline, ohne CDN). Läuft automatisch vor "dev" und "build".
// Versionen sind in package.json fest eingetragen (Regressionstest: npm run test:recognition).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'public/tesseract');
const files = [
  ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  // nur LSTM-Varianten (OEM.LSTM_ONLY); der Browser lädt davon genau eine, je nach SIMD-Unterstützung
  ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js', 'core/tesseract-core-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'core/tesseract-core-simd-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'core/tesseract-core-relaxedsimd-lstm.wasm.js'],
  ['node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'lang/eng.traineddata.gz']
];
for (const [from, to] of files) {
  const dest = path.join(target, to);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(root, from), dest);
}
console.log(`Tesseract-Dateien nach ${path.relative(root, target)}/ kopiert (${files.length} Dateien)`);
