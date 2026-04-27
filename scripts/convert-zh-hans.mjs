import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import * as OpenCC from '/tmp/node_modules/opencc-js/dist/esm/full.js';

const ROOT = '/tmp/pd-text-corpus-out/bibles';
const SRC = join(ROOT, 'zh-Hant');
const DST = join(ROOT, 'zh-Hans');

const converter = OpenCC.Converter({ from: 'tw', to: 'cn' });

function copyDirConverted(src, dst) {
  for (const entry of readdirSync(src)) {
    const sp = join(src, entry);
    const dp = join(dst, entry);
    const st = statSync(sp);
    if (st.isDirectory()) {
      mkdirSync(dp, { recursive: true });
      copyDirConverted(sp, dp);
    } else if (entry.endsWith('.json')) {
      const data = JSON.parse(readFileSync(sp, 'utf8'));
      let out;
      if (data.verses) {
        out = { verses: data.verses.map(v => ({ verse: v.verse, text: converter(v.text) })) };
      } else if (data.code === 'zh-Hant' || data.name?.includes('和合本')) {
        out = { ...data, code: 'zh-Hans', name: '聖經和合本 1919（簡體，由繁體經 OpenCC 轉換生成）' };
        if (out.books) out.books = out.books.map(b => ({ ...b, name: converter(b.name) }));
      } else {
        out = data;
        if (out.name) out.name = converter(out.name);
      }
      writeFileSync(dp, JSON.stringify(out));
    }
  }
}

mkdirSync(DST, { recursive: true });
copyDirConverted(SRC, DST);
console.log('zh-Hans generated from zh-Hant via OpenCC (tw→cn)');
