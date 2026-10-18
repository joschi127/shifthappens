import { describe, expect, it } from 'vitest';
import { collectLicenses, packageFromModuleId, runtimeDependencyDirs } from './third-party-licenses.mjs';

const root = process.cwd();

describe('packageFromModuleId', () => {
  it('erkennt einfache und Scope-Pakete, auch verschachtelt und mit Query', () => {
    expect(packageFromModuleId('/app/node_modules/dexie/dist/dexie.mjs')?.name).toBe('dexie');
    expect(packageFromModuleId('/app/node_modules/@ionic/core/components/index.js?v=1')).toEqual({
      name: '@ionic/core',
      dir: '/app/node_modules/@ionic/core'
    });
    expect(packageFromModuleId('/app/node_modules/a/node_modules/b/index.js')?.name).toBe('b');
    expect(packageFromModuleId('\0vite/preload-helper')).toBeNull();
    expect(packageFromModuleId('/app/src/main.ts')).toBeNull();
  });
});

describe('collectLicenses', () => {
  const licenses = collectLicenses(root, runtimeDependencyDirs(root));
  const byName = (name) => licenses.find(entry => entry.name === name);

  it('enthält App-Bibliotheken, Texterkennung samt Sprachdaten und Service-Worker-Laufzeit', () => {
    for (const name of ['vue', 'dexie', '@ionic/core', 'tesseract.js', 'tesseract.js-core', 'Leptonica', 'workbox-core', 'buffer']) {
      expect(byName(name), name).toBeDefined();
    }
    expect(licenses.some(entry => entry.name.startsWith('Tesseract OCR – Sprachdaten'))).toBe(true);
    expect(byName('shifthappens')).toBeUndefined();
  });

  it('liefert zu jedem Eintrag einen Lizenztext, bei Apache-2.0 auch NOTICE', () => {
    for (const entry of licenses) expect(entry.texts.length, entry.name).toBeGreaterThan(0);
    expect(byName('dexie').texts.map(t => t.file)).toContain('NOTICE');
  });

  it('ergänzt den Standardtext, wenn dem Paket keiner beiliegt', () => {
    const ionicVue = byName('@ionic/vue');
    expect(ionicVue.texts[0].text).toContain('Permission is hereby granted');
    expect(ionicVue.note).toMatch(/kein Lizenztext/);
  });

  it('BSD-2-Clause-Text ohne dritte Klausel', () => {
    const text = byName('Leptonica').texts[0].text;
    expect(text).toContain('2. Redistributions in binary form');
    expect(text).not.toContain('Neither the name');
  });
});
