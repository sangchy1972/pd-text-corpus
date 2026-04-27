# pd-text-corpus

Multilingual scripture corpus, normalized to per-chapter JSON files. Sourced from public-domain (or permissively-licensed) editions only. Mirrored here for permanent availability — used as the canonical CDN endpoint for the [HerBibleApp](https://github.com/sangchy1972) project.

## Why this exists

Public-domain religious texts can disappear from third-party APIs without notice. This repository keeps a frozen, normalized, format-stable copy that can be served via [jsDelivr](https://www.jsdelivr.com/) at zero cost, indefinitely.

## Translations included

| Code | Edition | Year | Language | License | Upstream source |
| --- | --- | --- | --- | --- | --- |
| `en` | King James Version | 1769 | English | Public Domain *(original text)* | [scrollmapper/bible_databases — KJV](https://github.com/scrollmapper/bible_databases/tree/master/sources/en/KJV) |
| `zh-Hant` | 聖經和合本 (繁體) | 1919 | Chinese (Traditional) | Public Domain (>100 yr) | [scrollmapper/bible_databases — ChiUn](https://github.com/scrollmapper/bible_databases/blob/master/formats/json/ChiUn.json) |
| `zh-Hans` | 圣经和合本 (简体) | 1919 | Chinese (Simplified) | Public Domain (>100 yr) | derived from `zh-Hant` via [OpenCC `tw→cn`](https://github.com/BYVoid/OpenCC) |
| `de` | Unrevidierte Elberfelder | 1905 | German | Public Domain (>100 yr) | [scrollmapper — GerElb1905](https://github.com/scrollmapper/bible_databases/tree/master/sources/de/GerElb1905) |
| `fr` | La Bible Augustin Crampon | 1923 | French | Public Domain | [scrollmapper — FreCrampon](https://github.com/scrollmapper/bible_databases/tree/master/sources/fr/FreCrampon) |
| `es` | Reina-Valera | 1909 | Spanish | Public Domain (>100 yr) | [scrollmapper — SpaRV](https://github.com/scrollmapper/bible_databases/tree/master/sources/es/SpaRV) |
| `pt` | Bíblia Livre | modern | Portuguese | [CC-BY-3.0-BR](https://creativecommons.org/licenses/by/3.0/br/deed.en) | [scrollmapper — PorBLivre](https://github.com/scrollmapper/bible_databases/tree/master/sources/pt/PorBLivre) |

### Public-domain evidence (per translation)

- **King James Version (1769)** — published 1611, current standard text 1769. Crown copyright in the UK was effectively waived for this text long ago; in the US and most of the world it is unambiguously public domain.
- **聖經和合本 (1919)** — translation completed and published 1919; all translators deceased before 1955. Public domain under any rule of national/international copyright.
- **Unrevidierte Elberfelder (1905)** — original translators (John Nelson Darby et al., revisers Brockhaus, et al.) all died long before the 70-year post-mortem cutoff. Public domain in Germany.
- **Bible Augustin Crampon (1923)** — Augustin Crampon died 1894; the 1923 revised edition is past the 70-year post-mortem cutoff. Public domain in France.
- **Reina-Valera (1909)** — Casiodoro de Reina (d. 1594) and Cipriano de Valera (d. 1602) translation; the 1909 revision is past 70-year cutoff. Public domain in Spain and Latin America.
- **Bíblia Livre (PorBLivre)** — modern translation released under CC-BY-3.0-BR. Attribution required: see `pt/index.json` `source` field. Used in lieu of an Almeida edition with verifiable PD status; consult a lawyer before relying on any specific Almeida edition for commercial redistribution.

### Translations explicitly substituted from the original request

The HerBibleApp design originally asked for KJV, Luther 1912, Louis Segond 1910, Reina-Valera 1909, 和合本, and Almeida. After surveying available open-source sources, the following substitutions were made because no clean PD JSON of the requested edition could be located in the available time:

- `de`: **Elberfelder 1905** (instead of Luther 1912 — Luther 1912 is PD but no maintained PD JSON found in scrollmapper/wldeh)
- `fr`: **Crampon 1923** (instead of Louis Segond 1910 — same reason)
- `pt`: **Bíblia Livre** (instead of Almeida Revista e Corrigida — modern Almeida revisions are copyrighted; older PD Almeida editions exist but are not available in clean JSON form)

Future PRs replacing these with the originally-requested editions are welcome.

## Schema

```
bibles/
├── manifest.json                  # global index of all translations
├── <code>/
│   ├── index.json                 # translation metadata + book list
│   └── books/
│       └── <book-slug>/
│           ├── index.json         # book metadata + chapter count
│           └── chapters/
│               └── <chapter>.json # { verses: [{ verse, text }, ...] }
```

### Per-chapter file shape

```json
{
  "verses": [
    { "verse": 1, "text": "In the beginning God created the heaven and the earth." },
    { "verse": 2, "text": "..." }
  ]
}
```

### Book slugs

All translations use the same English book slugs (e.g. `genesis`, `i-samuel`, `revelation-of-john`) so chapter URLs are interchangeable across languages. Book/chapter/verse numbering follows the standard 66-book Protestant canon (the French Crampon edition additionally includes 7 deuterocanonical books).

## Usage via jsDelivr

```
https://cdn.jsdelivr.net/gh/sangchy1972/pd-text-corpus@main/bibles/en/books/psalms/chapters/23.json
```

Pin a specific commit for production stability:

```
https://cdn.jsdelivr.net/gh/sangchy1972/pd-text-corpus@<commit-sha>/bibles/...
```

## Rebuilding

The `scripts/build-corpus.mjs` script downloads each upstream source and emits the normalized layout under `bibles/`. To regenerate:

```
npm install opencc-js
node scripts/build-corpus.mjs
node scripts/convert-zh-hans.mjs
```

## License

The **layout, scripts, and metadata files** in this repository are released under the MIT License (see `LICENSE`). Each individual translation retains its own license, listed above and in each `<code>/index.json`. Users redistributing translations from this corpus must comply with each translation's license — most are public domain; `pt` (Bíblia Livre) requires attribution under CC-BY-3.0-BR.
