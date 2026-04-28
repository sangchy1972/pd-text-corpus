import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = '/tmp/pd-text-corpus-out/bibles';
const codes = readdirSync(ROOT).filter(n => statSync(join(ROOT, n)).isDirectory()).sort();

const translations = codes.map(code => {
  const idx = JSON.parse(readFileSync(join(ROOT, code, 'index.json'), 'utf8'));
  return {
    code: idx.code,
    name: idx.name,
    license: idx.license,
    source: idx.source,
    stats: idx.stats,
  };
});

writeFileSync(
  join(ROOT, 'manifest.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), translations }, null, 2)
);
console.log('Wrote manifest with', translations.length, 'translations');
console.log(translations.map(t => `  ${t.code.padEnd(8)} ${t.stats.books}b ${t.stats.chapters}ch ${t.stats.verses}v`).join('\n'));
