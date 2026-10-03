# Frieren vs Aura — research and next-phase abilities

Research date: 2026-10-03. This note focuses on the Aura encounter and early-series abilities; it contains encounter spoilers. The game is a fan-made adaptation, not a canonical combat simulator.

## What the sources establish

**Aura the Guillotine** is one of the Seven Sages of Destruction. Her signature obedience spell, **Auserlese** (アゼリューゼ), uses the **Scales of Obedience** to subjugate opponents with less mana than her. This is the defining mechanic described by the [official anime character profile](https://frieren-anime.jp/character/chara_group2/2-2/). The [official magic catalog](https://frieren-anime.jp/special/magic/) also lists the spell. The manga encounter appears in [VIZ's Volume 3](https://www.viz.com/manga-books/manga/frieren-beyond-journey-s-end-volume-3/product/7000/paperback).

Aura fights through an army of controlled, headless armored warriors, which wears down opponents before the decisive mana comparison. The scales can turn against her when her opponent has more mana. Army behavior and the two-way risk are summarized by the secondary [Aura profile](https://frieren.fandom.com/wiki/Aura) and [Scales of Obedience reference](https://frieren.fandom.com/wiki/Scales_of_Obedience), with manga/anime references. They are useful supporting summaries, not official documentation.

**Frieren** uses offensive magic, protective barriers, mana concealment, and spell analysis. Her deliberate suppression and later revelation of her enormous mana are central to her confrontation with Aura. [Episode 10's official licensed synopsis](https://www.crunchyroll.com/watch/GVWU0WMW4/a-powerful-mage) identifies her training under Flamme and the scales as the encounter's focus; [Sony's official event transcript](https://www.sony.com/en/transcript/CrunchyrollAnimeAwards2025/Full.html) describes the mana-revelation scene. Supporting spell details are indexed in the secondary [Frieren reference](https://frieren.fandom.com/wiki/Frieren).

There is no canonical three-button Attack/Guard/Charge kit or fixed damage table. In particular, this research does **not** establish a special personal “Aura shield” spell or that her sword is her primary combat style. The supplied art retains her sword, while our effects emphasize her army and scales.

## Implemented now: a small, readable adaptation

Frieren keeps Attack, Guard, and Charge. Her existing spell bolt and barrier remain visual interpretations. There are no mana meters, cooldowns, extra action buttons, or obedience status effects yet.

| Aura's announced turn | Current game rule | Visual | Relationship to the story |
| --- | --- | --- | --- |
| Guard | Halve Frieren's final attack damage, rounded up. Deal 0 damage. | An armored servant screens Aura. | Army-based protection is a game interpretation, not a named canonical guard ability. |
| Attack | Deal 4 damage after Frieren's action. | Command trail and an attacking armored servant. | Inspired by her use of controlled warriors. |
| Charge | Deal 0 damage; allow full incoming damage. Next turn is Assault. | Her scales sway and glow with gathered mana. | Telegraphing and a one-turn windup are game rules. No soul comparison occurs. |
| Assault | Deal 10 damage, or 1 against Frieren's Guard. | Multiple armored servants advance. | A stronger army command, not Auserlese redefined as a damage beam. |

The cycle repeats in that order. Aura's Guard is active during the player's move; her attacks resolve afterward. Critical hits are rolled before her guard reduction. A killing blow prevents the enemy response. The 50% reduction, damage values, cycle, and critical chance are balance decisions, not facts about the series.

## Next phase: candidate ability notes, not implemented

| Character | Ability / technique | Canon basis | Small-screen game proposal |
| --- | --- | --- | --- |
| Aura | Auserlese / Scales of Obedience | Mana-based subjugation, with a risk of reversal. | A clearly announced mana contest with a turn to respond. Show two scale pans and the stakes. Never an invisible random instant loss. |
| Aura | Controlled army | Sustained attacks through subjugated warriors. | At most two visible servant tokens. Removing a token weakens the next attack or guard. |
| Aura | Mana assessment | She bases the scales decision on her reading of the opponent. | Her decision uses visible/revealed mana; concealment can mislead her. Avoid inventing a named “mana scan” spell. |
| Frieren | Zoltraak | Offensive magic listed in the [official magic catalog](https://frieren-anime.jp/special/magic/); a central attack in the series. | Upgrade the existing Attack into a named, mana-costing shot. Do not claim the current random damage formula is canonical. |
| Frieren | Defensive magic | Protective barriers; the [official catalog](https://frieren-anime.jp/special/magic/) lists defensive magic, with caster details in the [secondary character reference](https://frieren.fandom.com/wiki/Frieren). | Upgrade Guard to a short barrier with a visible mana cost. |
| Frieren | Mana suppression and revelation | Concealed strength is pivotal to the Aura confrontation. | Hide stored mana, then reveal it as a counter to the scales. Suppression disguises existing mana; it does not create energy. |
| Frieren | Dispel / spell analysis | She removes control from Aura's soldiers; see the [chapter 18 summary](https://frieren.fandom.com/wiki/Chapter_18) and the official catalog's dispelling entry. | Spend mana to remove one servant or break a temporary guard. The cost creates a choice between immediate safety and saving mana for the scales. |

Recommended next-phase starting point: add one visible mana resource, Aura's announced scales contest, and Frieren's reveal response. Keep the remaining abilities as later candidates until the basic duel is still understandable at 320px. Damage, costs, cooldowns, tie behavior, and victory effects require a separate design pass.

## Artwork notes

Aura uses the supplied 96 × 110 true pixel SVG. `assets/aura-original.svg` preserves it unchanged. `tools/prepare-aura.py` groups its 5,125 pixel cells into six independently animated layers, preserving all 95 colors. Paths use integer row runs and crisp edges, with no smoothing. Hair, cape, and scale pans move in one-pixel steps; a separate eye overlay creates occasional blinks. The army and mana effects reflect the announced intent.

The standalone pixel asset is `assets/aura.svg`; the game embeds its generated layers from `aura-source.mjs`. Both characters remain self-contained in the battle SVG. Motion stops under reduced-motion preferences, and defeated Aura is still.
