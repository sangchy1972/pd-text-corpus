# pd-text-corpus

Multilingual scripture corpus, normalized to per-chapter JSON files. Sourced from public-domain (or permissively-licensed) editions only. Mirrored here for permanent availability — used as the canonical CDN endpoint for the [HerBibleApp](https://github.com/sangchy1972) project.

## Why this exists

Public-domain religious texts can disappear from third-party APIs without notice. This repository keeps a frozen, normalized, format-stable copy that can be served via [jsDelivr](https://www.jsdelivr.com/) at zero cost, indefinitely.

## Translations included

| Code | Edition | Year | Language | License | Upstream source |
| --- | --- | --- | --- | --- | --- |
| `en` | King James Version | 1769 | English | Public Domain | [scrollmapper/bible_databases — KJV](https://github.com/scrollmapper/bible_databases/tree/master/sources/en/KJV) |
| `zh-Hant` | 聖經和合本 (繁體) | 1919 | Chinese (Traditional) | Public Domain | [scrollmapper/bible_databases — ChiUn](https://github.com/scrollmapper/bible_databases/blob/master/formats/json/ChiUn.json) |
| `zh-Hans` | 圣经和合本 (简体) | 1919 | Chinese (Simplified) | Public Domain | derived from `zh-Hant` via [OpenCC `tw→cn`](https://github.com/BYVoid/OpenCC) |
| `de` | Lutherbibel | 1912 | German | Public Domain | [seven1m/open-bibles — deu-luther1912.osis.xml](https://github.com/seven1m/open-bibles/blob/master/deu-luther1912.osis.xml) |
| `fr` | Louis Segond | 1910 | French | Public Domain | [eBible.org — fraLSG](https://eBible.org/find/details.php?id=fraLSG) |
| `es` | Reina-Valera | 1909 | Spanish | Public Domain | [scrollmapper/bible_databases — SpaRV](https://github.com/scrollmapper/bible_databases/tree/master/sources/es/SpaRV) |
| `pt` | João Ferreira de Almeida | — | Portuguese | Public Domain | [seven1m/open-bibles — por-almeida.usfx.xml](https://github.com/seven1m/open-bibles/blob/master/por-almeida.usfx.xml) |

### Public-domain evidence (per translation)

- **King James Version (1769)** — Crown copyright in the UK was effectively waived for this text long ago; in the US and most of the world it is unambiguously public domain.
- **聖經和合本 (1919)** — translation completed and published 1919; all translators deceased before 1955. Public domain under any rule of national/international copyright.
- **Lutherbibel (1912)** — text declared "found in the Public Domain" by source's OSIS metadata. Martin Luther died 1546; revisions through 1912 are well over the 70-year post-mortem cutoff.
- **Louis Segond (1910)** — Louis Segond died 1885; the 1910 edition is well past the 70-year post-mortem cutoff. eBible.org explicitly states "This Bible is in the Public Domain. It is not copyrighted."
- **Reina-Valera (1909)** — Casiodoro de Reina (d. 1594) and Cipriano de Valera (d. 1602) translation; the 1909 revision is past the 70-year cutoff. Public domain in Spain and Latin America.
- **João Ferreira de Almeida** — Almeida died 1691. The Almeida text in `seven1m/open-bibles` is marked Public Domain in the upstream catalogue; this is one of the older Almeida editions free of modern revision copyrights. Verify with counsel before assuming any specific Almeida edition is PD for high-stakes redistribution.

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

All translations use the same English book slugs (e.g. `genesis`, `i-samuel`, `revelation-of-john`) so chapter URLs are interchangeable across languages. Book/chapter/verse numbering follows the standard 66-book Protestant canon.

## Statistics (per translation)

| Code | Books | Chapters | Verses |
| --- | --- | --- | --- |
| en | 66 | 1189 | 31102 |
| zh-Hant | 66 | 1189 | 31103 |
| zh-Hans | 66 | 1189 | 31103 |
| de | 66 | 1189 | 31171 |
| fr | 66 | 1189 | 31170 |
| es | 66 | 1189 | 31084 |
| pt | 66 | 1189 | 31098 |

(Variation in verse counts across translations reflects different versification choices — e.g. some translations split or join verses differently in the Psalms or in disputed passages.)

## Usage via jsDelivr

```
https://cdn.jsdelivr.net/gh/sangchy1972/pd-text-corpus@main/bibles/en/books/psalms/chapters/23.json
```

Pin a specific commit for production stability:

```
https://cdn.jsdelivr.net/gh/sangchy1972/pd-text-corpus@<commit-sha>/bibles/...
```

## Rebuilding

The `scripts/` directory contains the download + normalization scripts:

- `build-corpus.mjs` — fetches scrollmapper sources for `en`, `zh-Hant`, `es`
- `convert-zh-hans.mjs` — generates `zh-Hans` from `zh-Hant` via OpenCC
- `build-de-fr-pt.mjs` — fetches `de` (Luther OSIS), `fr` (eBible LSG USFX), `pt` (Almeida USFX) and parses each
- `regen-manifest.mjs` — rebuilds `bibles/manifest.json` from each translation's index

```
npm install opencc-js
node scripts/build-corpus.mjs
node scripts/convert-zh-hans.mjs
node scripts/build-de-fr-pt.mjs
node scripts/regen-manifest.mjs
```

## License

The **layout, scripts, and metadata files** in this repository are released under the MIT License (see `LICENSE`). Each individual translation retains its own license (all are Public Domain — see "Translations included" above).
