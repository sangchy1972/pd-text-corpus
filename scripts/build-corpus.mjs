import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const SOURCES = [
  { code: 'en',      name: 'King James Version 1769',           url: 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/sources/en/KJV/KJV.json',                  license: 'Public Domain' },
  { code: 'zh-Hant', name: '聖經和合本 1919（繁體）',              url: 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/ChiUn.json',                license: 'Public Domain' },
  { code: 'de',      name: 'Unrevidierte Elberfelder 1905',     url: 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/sources/de/GerElb1905/GerElb1905.json',    license: 'Public Domain' },
  { code: 'fr',      name: 'Bible Augustin Crampon 1923',       url: 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/sources/fr/FreCrampon/FreCrampon.json',    license: 'Public Domain' },
  { code: 'es',      name: 'Reina-Valera 1909',                 url: 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/sources/es/SpaRV/SpaRV.json',              license: 'Public Domain' },
  { code: 'pt',      name: 'Bíblia Livre',                       url: 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/sources/pt/PorBLivre/PorBLivre.json',      license: 'CC-BY-3.0-BR' },
];

const slug = (s) => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function main() {
  const outRoot = '/tmp/pd-text-corpus-out';
  rmSync(outRoot, { recursive: true, force: true });
  mkdirSync(outRoot, { recursive: true });

  const stats = {};

  for (const src of SOURCES) {
    process.stdout.write(`[${src.code}] ${src.name} ... `);
    const data = await fetchJson(src.url);
    let books = 0, chapters = 0, verses = 0;
    const bookList = [];

    for (const book of data.books || []) {
      const bookSlug = slug(book.name);
      books++;
      const chapList = [];
      for (const ch of book.chapters || []) {
        chapters++;
        const verseArr = (ch.verses || []).map(v => ({
          verse: typeof v.verse === 'string' ? parseInt(v.verse, 10) : v.verse,
          text: (v.text || '').trim().replace(/\s+/g, ' '),
        })).filter(v => v.text);
        verses += verseArr.length;
        chapList.push({ chapter: ch.chapter, verseCount: verseArr.length });
        const dir = join(outRoot, 'bibles', src.code, 'books', bookSlug, 'chapters');
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, `${ch.chapter}.json`), JSON.stringify({ verses: verseArr }));
      }
      bookList.push({ name: book.name, slug: bookSlug, chapters: chapList.length });
      writeFileSync(
        join(outRoot, 'bibles', src.code, 'books', bookSlug, 'index.json'),
        JSON.stringify({ name: book.name, chapters: chapList }, null, 2)
      );
    }

    const meta = {
      code: src.code,
      name: src.name,
      license: src.license,
      source: src.url,
      generatedAt: new Date().toISOString(),
      stats: { books, chapters, verses },
    };
    writeFileSync(
      join(outRoot, 'bibles', src.code, 'index.json'),
      JSON.stringify({ ...meta, books: bookList }, null, 2)
    );

    stats[src.code] = { books, chapters, verses };
    console.log(`${books}b / ${chapters}ch / ${verses}v`);
  }

  writeFileSync(
    join(outRoot, 'bibles', 'manifest.json'),
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      translations: SOURCES.map(s => ({
        code: s.code,
        name: s.name,
        license: s.license,
        source: s.url,
        stats: stats[s.code],
      })),
    }, null, 2)
  );

  console.log('\nDone. Output in', outRoot);
}

main().catch(e => { console.error(e); process.exit(1); });
