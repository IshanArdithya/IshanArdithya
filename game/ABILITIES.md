# Frieren vs Aura — research and next-phase abilities

Research date: 2026-10-03. This note focuses on the Aura encounter and early-series abilities; it contains encounter spoilers. The game is a fan-made adaptation, not a canonical combat simulator.

## What the sources establish

**Aura the Guillotine** is one of the Seven Sages of Destruction. Her signature obedience spell, **Auserlese** (アゼリューゼ), uses the **Scales of Obedience** to subjugate opponents with less mana than her. This is the defining mechanic described by the [official anime character profile](https://frieren-anime.jp/character/chara_group2/2-2/). The [official magic catalog](https://frieren-anime.jp/special/magic/) also lists the spell. The manga encounter appears in [VIZ's Volume 3](https://www.viz.com/manga-books/manga/frieren-beyond-journey-s-end-volume-3/product/7000/paperback).

Aura fights through an army of controlled, headless armored warriors, which wears down opponents before the decisive mana comparison. The scales can turn against her when her opponent has more mana. Army behavior and the two-way risk are summarized by the secondary [Aura profile](https://frieren.fandom.com/wiki/Aura) and [Scales of Obedience reference](https://frieren.fandom.com/wiki/Scales_of_Obedience), with manga/anime references. They are useful supporting summaries, not official documentation.

**Frieren** uses offensive magic, protective barriers, mana concealment, and spell analysis. Her deliberate suppression and later revelation of her enormous mana are central to her confrontation with Aura. [Episode 10's official licensed synopsis](https://www.crunchyroll.com/watch/GVWU0WMW4/a-powerful-mage) identifies her training under Flamme and the scales as the encounter's focus; [Sony's official event transcript](https://www.sony.com/en/transcript/CrunchyrollAnimeAwards2025/Full.html) describes the mana-revelation scene. Supporting spell details are indexed in the secondary [Frieren reference](https://frieren.fandom.com/wiki/Frieren).

There is no canonical three-button Attack/Guard/Charge kit or fixed damage table. In particular, this research does **not** establish a special personal “Aura shield” spell or that her sword is her primary combat style. The supplied art retains her sword, while our effects emphasize her army and scales.

## Implemented now: mana and Unleashed Zoltraak

Frieren has 26 HP / 240 MP; Aura has 100 HP and starts with 40/60 MP. The four-to-one maximum-mana ratio is a game choice representing Frieren's much larger reserve. The series does not provide these numeric measurements.

The new **Unleashed Zoltraak** button adapts her ordinary offensive magic and revealed mana into a stronger shot. Zoltraak itself appears in the [official magic catalog](https://frieren-anime.jp/special/magic/). The word “Unleashed,” its ultimate classification, and all numerical mechanics below are our design, not an official ultimate spell name.

| Character / action | Implemented rule | Canon relationship |
| --- | --- | --- |
| Frieren / Attack | 10 MP for 5–7 damage; charged: 20 MP for 14–18. 10% critical chance. | Generic offensive magic, with original game damage rolls. |
| Frieren / Guard | 15 MP, incoming damage at most 1. One intervening turn before reuse. | Inspired by defensive magic; cooldown is a game rule. |
| Frieren / Charge | Restore up to 40 MP and ready a charged attack/ultimate. Can refill while charged. | A resource-recovery adaptation, not a claim that revealing hidden mana creates more energy. |
| Frieren / Unleashed Zoltraak | 80 MP, requires/consumes charge, 32 fixed damage. Six other accepted turns before reuse. Aura's guard halves it. | A stronger Zoltraak presentation, without a canonical “ultimate form” claim. |
| Aura / Guard | 15 MP, halve incoming damage (rounded up), no outgoing damage. | Army-based protection is a game adaptation. |
| Aura / Attack | One controlled soldier deals 4 damage, no MP cost. | Inspired by her use of the controlled army. |
| Aura / Charge | Recover up to 35 MP, deal 0 damage. | A game windup/recovery mechanic using her scales visually. |
| Aura / Assault | 30 MP, army deals 10 damage. | A stronger army command, not obedience magic repurposed into a damage beam. |

Aura cycles Guard → Attack → Charge → Assault. An unaffordable Guard/Assault becomes a visibly announced mana recovery turn instead; it deals no damage and offers no damage reduction. The enemy pattern then advances normally. This makes her mana availability matter before the player acts.

Both cooldowns belong to the shared encounter. Invalid requests and retries do not advance them. The ultimate cannot critically hit, gain another charged multiplier, or bypass guard. These limits prevent an automatic victory while allowing tactical players to finish faster. See the [simulation results](README.md#balance-validation).

## Still reserved for a later phase

- **Aura's actual Auserlese / Scales of Obedience contest:** compare mana with clearly announced stakes and a response turn. It is not implemented by the current Charge animation.
- **Frieren's mana suppression/revelation as deception:** conceal existing mana, then reveal it to counter the scales. This would need a visible versus hidden mana model.
- **Frieren's dispelling / spell analysis:** potentially remove a controlled soldier or temporary guard, based on the [chapter 18 summary](https://frieren.fandom.com/wiki/Chapter_18) and official spell catalog.
- **Army tokens with separate health:** current soldiers illustrate Aura's commands; they are not separately targetable combatants.

## Artwork notes

The forest is the supplied 320 × 180 pixel SVG, preserved in `assets/forest-original.svg`. `tools/prepare-forest.py` compacts all 57,600 pixels and 192 colors into same-color paths without changing the image. It fills a 640 × 360 battlefield inside the 640 × 624 scene, at two scene pixels per source pixel. Small original-color canopy highlights move over the intact background; translucent sunlight and drifting pollen add ambient motion. Status bands stay outside the battlefield, and reduced motion freezes all ambient effects.

Frieren uses the supplied 128 × 96 uniform pixel SVG. `assets/frieren-original.svg` preserves it unchanged. `tools/prepare-frieren.py` partitions its 3,276 pixel cells and 95 colors into a body and two hair layers. Twin tails move independently in one-pixel steps, with original-color joint patches preventing gaps; pixel eyelids create half/closed blink frames. Staff casting, defensive barrier, mana charge, and victory effects remain separate vector geometry. The former embedded PNG is no longer used.

Aura uses the supplied 128 × 96 uniform pixel SVG. `assets/aura-original.svg` preserves it unchanged. `tools/prepare-aura.py` groups its 2,724 pixel cells into six independently animated layers, preserving all 93 colors. Paths use integer row runs and crisp edges, with no smoothing. Aura renders at two scene pixels per source pixel. Frieren and her effects render 20% smaller, at 1.6, to balance the different sprite proportions; their original SVG geometry remains unchanged. Hair, cape, and scale pans move in one-pixel steps; a separate eye overlay creates occasional blinks. The army and mana effects reflect the announced intent.

The standalone pixel asset is `assets/aura.svg`; the game embeds its generated layers from `aura-source.mjs`. Both characters remain self-contained in the battle SVG. Motion stops under reduced-motion preferences, and defeated Aura is still.
