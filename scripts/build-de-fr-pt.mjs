import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync, createWriteStream } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

// Canonical 66-book mapping. Each entry: { name, slug }
const BOOKS = [
  ['Genesis','genesis'],['Exodus','exodus'],['Leviticus','leviticus'],['Numbers','numbers'],['Deuteronomy','deuteronomy'],
  ['Joshua','joshua'],['Judges','judges'],['Ruth','ruth'],['I Samuel','i-samuel'],['II Samuel','ii-samuel'],
  ['I Kings','i-kings'],['II Kings','ii-kings'],['I Chronicles','i-chronicles'],['II Chronicles','ii-chronicles'],
  ['Ezra','ezra'],['Nehemiah','nehemiah'],['Esther','esther'],['Job','job'],['Psalms','psalms'],['Proverbs','proverbs'],
  ['Ecclesiastes','ecclesiastes'],['Song of Solomon','song-of-solomon'],['Isaiah','isaiah'],['Jeremiah','jeremiah'],
  ['Lamentations','lamentations'],['Ezekiel','ezekiel'],['Daniel','daniel'],['Hosea','hosea'],['Joel','joel'],['Amos','amos'],
  ['Obadiah','obadiah'],['Jonah','jonah'],['Micah','micah'],['Nahum','nahum'],['Habakkuk','habakkuk'],
  ['Zephaniah','zephaniah'],['Haggai','haggai'],['Zechariah','zechariah'],['Malachi','malachi'],
  ['Matthew','matthew'],['Mark','mark'],['Luke','luke'],['John','john'],['Acts','acts'],['Romans','romans'],
  ['I Corinthians','i-corinthians'],['II Corinthians','ii-corinthians'],['Galatians','galatians'],['Ephesians','ephesians'],
  ['Philippians','philippians'],['Colossians','colossians'],['I Thessalonians','i-thessalonians'],['II Thessalonians','ii-thessalonians'],
  ['I Timothy','i-timothy'],['II Timothy','ii-timothy'],['Titus','titus'],['Philemon','philemon'],['Hebrews','hebrews'],
  ['James','james'],['I Peter','i-peter'],['II Peter','ii-peter'],['I John','i-john'],['II John','ii-john'],
  ['III John','iii-john'],['Jude','jude'],['Revelation of John','revelation-of-john'],
];

// OSIS book IDs -> 1-based index
const OSIS_MAP = {
  Gen:1, Exod:2, Lev:3, Num:4, Deut:5, Josh:6, Judg:7, Ruth:8, '1Sam':9, '2Sam':10,
  '1Kgs':11, '2Kgs':12, '1Chr':13, '2Chr':14, Ezra:15, Neh:16, Esth:17, Job:18, Ps:19, Prov:20,
  Eccl:21, Song:22, Isa:23, Jer:24, Lam:25, Ezek:26, Dan:27, Hos:28, Joel:29, Amos:30,
  Obad:31, Jonah:32, Mic:33, Nah:34, Hab:35, Zeph:36, Hag:37, Zech:38, Mal:39,
  Matt:40, Mark:41, Luke:42, John:43, Acts:44, Rom:45, '1Cor':46, '2Cor':47, Gal:48, Eph:49,
  Phil:50, Col:51, '1Thess':52, '2Thess':53, '1Tim':54, '2Tim':55, Titus:56, Phlm:57, Heb:58, Jas:59,
  '1Pet':60, '2Pet':61, '1John':62, '2John':63, '3John':64, Jude:65, Rev:66,
};

// USFX 3-letter codes -> 1-based index
const USFX_MAP = {
  GEN:1, EXO:2, LEV:3, NUM:4, DEU:5, JOS:6, JDG:7, RUT:8, '1SA':9, '2SA':10,
  '1KI':11, '2KI':12, '1CH':13, '2CH':14, EZR:15, NEH:16, EST:17, JOB:18, PSA:19, PRO:20,
  ECC:21, SNG:22, ISA:23, JER:24, LAM:25, EZK:26, DAN:27, HOS:28, JOL:29, AMO:30,
  OBA:31, JON:32, MIC:33, NAM:34, HAB:35, ZEP:36, ZEC:37, HAG:38, MAL:39,
  MAT:40, MRK:41, LUK:42, JHN:43, ACT:44, ROM:45, '1CO':46, '2CO':47, GAL:48, EPH:49,
  PHP:50, COL:51, '1TH':52, '2TH':53, '1TI':54, '2TI':55, TIT:56, PHM:57, HEB:58, JAS:59,
  '1PE':60, '2PE':61, '1JN':62, '2JN':63, '3JN':64, JUD:65, REV:66,
};

// Note: USFX swaps HAG/ZEC vs canonical Hag/Zech ordering. Canonical 66-book order: ...Zephaniah, Haggai, Zechariah, Malachi.
// Fix: HAG=37, ZEC=38 (matches OSIS order)
USFX_MAP.HAG = 37;
USFX_MAP.ZEC = 38;

const stripWhitespace = (s) => (s || '').replace(/\s+/g, ' ').trim();

// ---- Parsers --------------------------------------------------------------

function parseOSIS(xml) {
  // Returns Map<bookIdx, Map<chapter, Map<verse, text>>>
  const out = new Map();
  // Match <verse osisID='Book.chapter.verse' ...>text</verse> AND self-closing markers? OSIS often has <verse osisID="X" sID="..."/> markers.
  // Use the inline-content form first.
  const re = /<verse[^>]*osisID=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/verse>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const [, id, raw] = m;
    const parts = id.split('.');
    if (parts.length !== 3) continue;
    const [bookId, ch, vs] = parts;
    const idx = OSIS_MAP[bookId];
    if (!idx) continue;
    const text = stripWhitespace(raw.replace(/<[^>]+>/g, ' '));
    if (!text) continue;
    if (!out.has(idx)) out.set(idx, new Map());
    const book = out.get(idx);
    const chN = parseInt(ch, 10);
    const vsN = parseInt(vs, 10);
    if (!book.has(chN)) book.set(chN, new Map());
    book.get(chN).set(vsN, text);
  }
  return out;
}

function parseUSFX(xml) {
  // USFX uses milestone markers: <c id="1"/> ... <v id="1"/>text<ve/> ...
  // Walk by book.
  const out = new Map();
  const bookRe = /<book id=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/book>/g;
  let bm;
  while ((bm = bookRe.exec(xml)) !== null) {
    const [, bookId, body] = bm;
    const idx = USFX_MAP[bookId];
    if (!idx) continue;
    const book = new Map();
    out.set(idx, book);

    // Split by chapter markers
    const chunks = body.split(/<c\s+id=['"](\d+)['"]\s*\/>/);
    // chunks[0] = pre-first-chapter (header), then [chapterNum, body, chapterNum, body, ...]
    for (let i = 1; i < chunks.length; i += 2) {
      const chN = parseInt(chunks[i], 10);
      const chBody = chunks[i + 1] || '';
      const ch = new Map();
      book.set(chN, ch);

      // Within chapter, verses delimited by <v id="N" ...> ... <ve/> (id may be followed by other attrs like bcv)
      const verseRe = /<v\s+id=['"](\d+(?:-\d+)?)['"][^>]*\/>([\s\S]*?)(?=<v\s+id=|<ve\s*\/>|$)/g;
      let vm;
      while ((vm = verseRe.exec(chBody)) !== null) {
        const [, vid, raw] = vm;
        // Strip cross-references and footnotes (entire block including content), THEN strip remaining tags
        const cleaned = raw
          .replace(/<x\b[^>]*>[\s\S]*?<\/x>/g, ' ')   // cross-references
          .replace(/<f\b[^>]*>[\s\S]*?<\/f>/g, ' ')   // footnotes
          .replace(/<note\b[^>]*>[\s\S]*?<\/note>/g, ' ') // generic notes
          .replace(/<[^>]+>/g, ' ');                  // remaining tags (keep text)
        const text = stripWhitespace(cleaned)
          .replace(/\s+([,.;:!?])/g, '$1')            // tighten punctuation spacing
          .replace(/[‘’]\s+/g, '’')                   // smart-quote spacing
          .replace(/\s+’/g, '’');
        if (!text) continue;
        const vsN = parseInt(vid.split('-')[0], 10);
        ch.set(vsN, text);
      }
    }
  }
  return out;
}

// ---- Writers --------------------------------------------------------------

function writeBible(code, name, license, source, parsed) {
  const root = '/tmp/pd-text-corpus-out/bibles/' + code;
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });

  let totalBooks = 0, totalChapters = 0, totalVerses = 0;
  const bookList = [];

  for (let idx = 1; idx <= 66; idx++) {
    if (!parsed.has(idx)) continue;
    const [bookName, bookSlug] = BOOKS[idx - 1];
    const book = parsed.get(idx);
    const chapters = [...book.entries()].sort((a, b) => a[0] - b[0]);
    if (chapters.length === 0) continue;
    totalBooks++;
    const chapList = [];
    for (const [chN, verses] of chapters) {
      totalChapters++;
      const verseArr = [...verses.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([vsN, text]) => ({ verse: vsN, text }));
      totalVerses += verseArr.length;
      const dir = join(root, 'books', bookSlug, 'chapters');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, chN + '.json'), JSON.stringify({ verses: verseArr }));
      chapList.push({ chapter: chN, verseCount: verseArr.length });
    }
    writeFileSync(
      join(root, 'books', bookSlug, 'index.json'),
      JSON.stringify({ name: bookName, chapters: chapList }, null, 2)
    );
    bookList.push({ name: bookName, slug: bookSlug, chapters: chapList.length });
  }

  const meta = {
    code, name, license, source,
    generatedAt: new Date().toISOString(),
    stats: { books: totalBooks, chapters: totalChapters, verses: totalVerses },
    books: bookList,
  };
  writeFileSync(join(root, 'index.json'), JSON.stringify(meta, null, 2));
  return meta.stats;
}

// ---- Sources --------------------------------------------------------------

async function fetchText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url);
  return r.text();
}

async function downloadAndUnzipUSFX(zipUrl, scratch) {
  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(scratch, { recursive: true });
  const zipPath = join(scratch, 'src.zip');
  execSync(`curl -sSL -o "${zipPath}" "${zipUrl}"`);
  execSync(`unzip -q -o "${zipPath}" -d "${scratch}"`);
  // Find the .usfx.xml file (one expected)
  const files = execSync(`find "${scratch}" -name '*usfx*.xml' -type f`).toString().trim().split('\n');
  if (files.length === 0 || !files[0]) throw new Error('No usfx file in zip');
  return readFileSync(files[0], 'utf8');
}

// ---- Main -----------------------------------------------------------------

async function main() {
  // de: Luther 1912 — OSIS from seven1m
  console.log('[de] Luther 1912 (seven1m OSIS)...');
  const deXml = await fetchText('https://raw.githubusercontent.com/seven1m/open-bibles/master/deu-luther1912.osis.xml');
  const dePar = parseOSIS(deXml);
  const deStats = writeBible(
    'de',
    'Lutherbibel 1912',
    'Public Domain',
    'https://github.com/seven1m/open-bibles (deu-luther1912.osis.xml)',
    dePar
  );
  console.log('  →', deStats);

  // fr: Louis Segond 1910 — USFX from eBible.org
  console.log('[fr] Louis Segond 1910 (eBible.org USFX)...');
  const frXml = await downloadAndUnzipUSFX(
    'https://eBible.org/Scriptures/fraLSG_usfx.zip',
    '/tmp/pd-text-corpus-fr-src'
  );
  const frPar = parseUSFX(frXml);
  const frStats = writeBible(
    'fr',
    'Louis Segond 1910',
    'Public Domain',
    'https://eBible.org/find/details.php?id=fraLSG (fraLSG_usfx.zip)',
    frPar
  );
  console.log('  →', frStats);

  // pt: Almeida — USFX from seven1m (PD per their README)
  console.log('[pt] João Ferreira de Almeida (seven1m USFX)...');
  const ptXml = await fetchText('https://raw.githubusercontent.com/seven1m/open-bibles/master/por-almeida.usfx.xml');
  const ptPar = parseUSFX(ptXml);
  const ptStats = writeBible(
    'pt',
    'João Ferreira de Almeida',
    'Public Domain',
    'https://github.com/seven1m/open-bibles (por-almeida.usfx.xml)',
    ptPar
  );
  console.log('  →', ptStats);

  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
