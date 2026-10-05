# Frieren-inspired game lettering

The supplied English logo references have classical serif lettering, irregular edges, and custom staff ornamentation. Research on 2026-10-04 did not establish a production-confirmed downloadable source font. Published identifications disagree: [Designbeep](https://designbeep.com/2025/11/16/frieren-font/) suggests 1756 Dutch, while [Made Good Designs](https://madegooddesigns.com/frieren-font/) describes custom lettering and explicitly qualifies its analysis as unconfirmed. Neither identifies an official font release. We therefore describe this implementation as **Frieren-inspired**, not the exact logo font.

The chosen approximation is **IM Fell DW Pica Roman**, designed by Igino Marini. Its old-style serifs and irregular contours provide a similar printed fantasy-book appearance without copying the staff ornament into every letter. The choice is our visual judgment, not a claim that the anime uses this typeface.

Source: [Google Fonts' official IM Fell DW Pica directory](https://github.com/google/fonts/tree/main/ofl/imfelldwpica). The unmodified `IMFePIrm28P.ttf` and its `OFL.txt` were downloaded from that directory. They are distributed under the SIL Open Font License 1.1, with the upstream copyright notice preserved. The generated module records the source font's SHA-256 digest.

`python3 game/tools/prepare-font.py` converts the needed capital letters, punctuation, and digits to SVG paths using **fonttools 4.66.1** (build-time dependency only). Numeric outlines are vertically aligned to a common cap height for readable counters; rendering gives them equal advance widths. Minus and check symbols are small original SVG shapes because this font lacks those code points. These are changes to game artwork; the source font file is unmodified.

`game/lettering.mjs` selects the needed glyph definitions for each image and reuses them with local SVG references. Health, mana, damage, cooldowns, and other changing values are assembled from the current state. SVG titles and accessible labels preserve the textual values. No runtime font dependency or network fetch is introduced.
