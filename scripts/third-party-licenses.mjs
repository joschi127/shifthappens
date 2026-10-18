// Erzeugt die Liste der mitgelieferten Fremdbibliotheken mit Lizenztexten (ADR 0015).
// Beim Build werden genau die Pakete erfasst, die im Bundle landen, plus die Dateien, die außerhalb
// des Bundles ausgeliefert werden (Texterkennung, Service Worker). Ergebnis: licenses.json im Build.
import fs from 'node:fs';
import path from 'node:path';

const OUTPUT_FILE = 'licenses.json';

// Ausgelieferte Pakete, die nicht über den Modulgraphen des App-Bundles erfasst werden
const EXTRA_PACKAGES = [
  // Worker und WebAssembly-Kern der Texterkennung (scripts/copy-tesseract-assets.mjs)
  'tesseract.js',
  'tesseract.js-core',
  // im vorgebauten Worker (worker.min.js) enthalten, siehe dessen Source-Map
  'bmp-js',
  'idb-keyval',
  'is-url',
  'regenerator-runtime',
  'wasm-feature-detect',
  'zlibjs',
  // Laufzeit des generierten Service Workers (vite-plugin-pwa / Workbox)
  'workbox-core',
  'workbox-expiration',
  'workbox-precaching',
  'workbox-routing',
  'workbox-strategies',
  'workbox-window'
];

const MIT_TEXT = `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.`;

const BSD_3_TEXT = `Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors
   may be used to endorse or promote products derived from this software
   without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`;

// Standardtexte für Pakete, denen kein Lizenztext beiliegt
const STANDARD_TEXTS = { MIT: MIT_TEXT, 'BSD-3-Clause': BSD_3_TEXT };

const BSD_2_TEXT = BSD_3_TEXT.replace(/\n\n3\. Neither[\s\S]*?permission\.\n/, '\n');

// Ergänzende Hinweise zu einzelnen Paketen
const NOTES = {
  'tesseract.js-core': 'WebAssembly-Fassung von Tesseract OCR (Apache-2.0) mit der Bildbibliothek Leptonica (eigener Eintrag).'
};

// Inhalte ohne eigenes (installiertes) npm-Paket mit passender Lizenz
const EXTRA_ENTRIES = [
  {
    name: 'Leptonica',
    license: 'BSD-2-Clause',
    homepage: 'https://github.com/DanBloomberg/leptonica',
    note: 'Bildbibliothek, im WebAssembly-Kern von tesseract.js (tesseract.js-core) enthalten.',
    texts: [{ file: 'leptonica-license.txt', text: `Copyright (C) 2001-2016 Leptonica.  All rights reserved.\n\n${BSD_2_TEXT}` }]
  },
  // Browser-Ersatz für Node-Module, von webpack in worker.min.js eingebaut (nicht in node_modules)
  {
    name: 'buffer',
    license: 'MIT',
    homepage: 'https://github.com/feross/buffer',
    note: 'Enthalten im Worker von tesseract.js.',
    texts: [{ file: 'LICENSE', text: `The MIT License (MIT)\n\nCopyright (c) Feross Aboukhadijeh, and other contributors.\n\n${MIT_TEXT}` }]
  },
  {
    name: 'base64-js',
    license: 'MIT',
    homepage: 'https://github.com/beatgammit/base64-js',
    note: 'Enthalten im Worker von tesseract.js.',
    texts: [{ file: 'LICENSE', text: `The MIT License (MIT)\n\nCopyright (c) 2014 Jameson Little\n\n${MIT_TEXT}` }]
  },
  {
    name: 'ieee754',
    license: 'BSD-3-Clause',
    homepage: 'https://github.com/feross/ieee754',
    note: 'Enthalten im Worker von tesseract.js.',
    texts: [{ file: 'LICENSE', text: `Copyright 2008 Fair Oaks Labs, Inc.\n\n${BSD_3_TEXT}` }]
  },
  {
    name: 'Tesseract OCR – Sprachdaten Englisch (tessdata_best, int)',
    version: '4.0.0',
    license: 'Apache-2.0',
    homepage: 'https://github.com/tesseract-ocr/tessdata_best',
    note: 'Ausgeliefert über das Paket @tesseract.js-data/eng (MIT). Die Sprachdaten selbst stehen unter der Apache-2.0-Lizenz.',
    licenseFrom: 'tesseract.js-core'
  }
];

const LICENSE_FILE = /^(licen[cs]e|copying|notice)(\.(md|txt|mit))?$/i;
const LICENSE_FILE_PREFIX = /^(licen[cs]e|copying|notice)[-.]/i;

/** Paketname zu einer Modul-ID (Pfad innerhalb von node_modules), sonst null */
export function packageFromModuleId(id) {
  const normalized = id.replace(/\\/g, '/').replace(/^\0/, '').split('?')[0];
  const index = normalized.lastIndexOf('/node_modules/');
  if (index < 0) return null;
  const parts = normalized.slice(index + '/node_modules/'.length).split('/');
  const name = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
  return { name, dir: normalized.slice(0, index + '/node_modules/'.length) + name };
}

const repositoryUrl = (pkg) => {
  const repo = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
  if (!repo) return pkg.homepage;
  if (/^github:/.test(repo) || /^[\w-]+\/[\w.-]+$/.test(repo)) return `https://github.com/${repo.replace(/^github:/, '')}`;
  return repo.replace(/^git\+/, '').replace(/^git:\/\//, 'https://').replace(/\.git$/, '');
};

const authorName = (author) => (typeof author === 'string' ? author : author?.name);

/** Lizenztexte (LICENSE, NOTICE, …) eines Paketverzeichnisses */
function licenseTexts(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(file => LICENSE_FILE.test(file) || LICENSE_FILE_PREFIX.test(file))
    .sort()
    .map(file => ({ file, text: fs.readFileSync(path.join(dir, file), 'utf8').trim() }));
}

function packageEntry(dir) {
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const license = typeof pkg.license === 'string' ? pkg.license : pkg.license?.type ?? 'unbekannt';
  return {
    name: pkg.name,
    version: pkg.version,
    license,
    author: authorName(pkg.author),
    homepage: repositoryUrl(pkg),
    texts: licenseTexts(dir)
  };
}

/** Fehlt der Lizenztext im Paket, den Standardtext der angegebenen Lizenz mit Hinweis anhängen */
function withFallbackText(entry) {
  if (entry.texts.length || !STANDARD_TEXTS[entry.license]) return entry;
  return {
    ...entry,
    note: 'Dem Paket liegt kein Lizenztext bei; angezeigt wird der Standardtext der angegebenen Lizenz. Rechteinhaber: siehe Projektseite.',
    texts: [{ file: entry.license, text: STANDARD_TEXTS[entry.license] }]
  };
}

/** Liste aller Einträge (sortiert, ohne Duplikate) zu den gegebenen Paketverzeichnissen */
export function collectLicenses(root, packageDirs) {
  const dirs = new Map(packageDirs.map(dir => [path.resolve(dir), true]));
  for (const name of EXTRA_PACKAGES) dirs.set(path.join(root, 'node_modules', name), true);

  const entries = new Map();
  for (const dir of dirs.keys()) {
    if (!fs.existsSync(path.join(dir, 'package.json'))) continue;
    const entry = packageEntry(dir);
    // Pakete ohne Namen sind Hilfsdateien (z. B. "type": "module"-Marker in Unterordnern)
    if (!entry.name || entry.name === 'shifthappens') continue;
    if (NOTES[entry.name]) entry.note = NOTES[entry.name];
    entries.set(`${entry.name}@${entry.version}`, withFallbackText(entry));
  }
  for (const extra of EXTRA_ENTRIES) {
    const { licenseFrom, ...entry } = extra;
    const texts = licenseFrom
      ? licenseTexts(path.join(root, 'node_modules', licenseFrom)).filter(t => /^licen/i.test(t.file))
      : entry.texts;
    entries.set(entry.name, { ...entry, texts });
  }
  return [...entries.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Laufzeit-Abhängigkeiten rekursiv ab package.json (Näherung für den Entwicklungsserver) */
export function runtimeDependencyDirs(root) {
  const seen = new Set();
  const visit = (name, fromDir) => {
    let dir = fromDir;
    // Node-Auflösung: node_modules im eigenen Verzeichnis, dann in den übergeordneten
    while (true) {
      const candidate = path.join(dir, 'node_modules', name);
      if (fs.existsSync(path.join(candidate, 'package.json'))) { dir = candidate; break; }
      const parent = path.dirname(dir);
      if (parent === dir) return;
      dir = parent;
    }
    if (seen.has(dir)) return;
    seen.add(dir);
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    for (const dep of Object.keys(pkg.dependencies ?? {})) visit(dep, dir);
  };
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const dep of Object.keys(pkg.dependencies ?? {})) visit(dep, root);
  return [...seen];
}

/** Vite-Plugin: licenses.json im Build erzeugen bzw. im Entwicklungsserver ausliefern */
export function thirdPartyLicenses() {
  let root = process.cwd();
  let base = '/';
  return {
    name: 'third-party-licenses',
    configResolved(config) {
      root = config.root;
      base = config.base;
    },
    configureServer(server) {
      server.middlewares.use(`${base}${OUTPUT_FILE}`, (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(collectLicenses(root, runtimeDependencyDirs(root))));
      });
    },
    generateBundle() {
      const dirs = new Set();
      for (const id of this.getModuleIds()) {
        const found = packageFromModuleId(id);
        if (found) dirs.add(found.dir);
      }
      this.emitFile({
        type: 'asset',
        fileName: OUTPUT_FILE,
        source: JSON.stringify(collectLicenses(root, [...dirs]))
      });
    }
  };
}
