# README Raid

A shared, asynchronous Frieren-versus-Aura battle for this GitHub profile. The game uses plain JavaScript, supplied character artwork composed into SVG scenes, GitHub Issues, and GitHub Actions. No hosted server, database, personal access token, or runtime dependencies are required.

## Local commands

Use Node.js 24 or later, from the repository root:

```sh
node game/local.mjs
```

Open **http://127.0.0.1:4173** to play immediately. Attack, Guard, Focus, Prepare Ult / Cast Ult, mana, cooldowns, critical hits, endings, and Play Again use the real battle engine and SVG renderer. Each attack gets fresh random rolls; the result also shows its damage calculation. The demo keeps its state only in the browser tab. Refresh or choose Reset demo to start over. It never writes the saved game, makes commits, or contacts GitHub. Stop the server with Ctrl+C. If the port is busy, use `PORT=4174 node game/local.mjs`.

This tests gameplay and artwork locally; GitHub issue handling and Actions still need separate live verification.

Other commands:

```sh
node --test game/test/*.test.mjs
node game/generate.mjs
node game/preview.mjs
```

Open `game/preview/index.html` to inspect the ready, focused, ultimate-prepared, attacking, guarding, critical, victory, defeat, Aura charge, and Aura assault, ultimate, and depleted-mana states at 640px and 320px. Preview files are ignored by Git. Browser motion and theme preferences apply to the preview. Rendering never advances the game or rolls damage.

The scene is 640 × 360: the full forest battlefield with the compact HUD overlaid at the top. At 320px wide it scales to 320 × 180. There is no bottom status panel; the README summary and local demo text retain attack focus, cooldown counts, and the next enemy intent. Victory and defeat appear over the battlefield after the turn finishes. The supplied background keeps its original 16:9 proportions; the battlefield is not cropped or stretched into a narrow strip.

`game/generate.mjs` defaults to this repository and `main` for local rendering. For a different repository or default branch:

```sh
GITHUB_REPOSITORY=owner/profile DEFAULT_BRANCH=trunk node game/generate.mjs
```

## Pixel HUD

The HUD occupies about 108 pixels over the top of the forest, with no separate header band. It uses a compact fighting-game layout: inset vector portraits at the outer edges, gold pixel frames, teal/magenta character accents, and a central **TURNS** medallion. HP is green and MP is blue for both characters, with smaller current/max counts centered inside each bar. Portraits have internal padding and a separate gutter before the bars; compact nameplates and resource rows leave breathing room around the turn medallion. The fills mirror each other and update with their numeric values at the existing action-resolution times. Portraits are lossless crops of the current pixel sprites; frames, bars, medallion, and ultimate badge are SVG geometry. Encounter numbers stay outside the HUD.

Below Frieren's mana bar, the borderless pixel nameplate separates Ultimate from Focus. **ULT READY** (gold) means the spell can be prepared: at least 80 MP, no cooldown, and an active battle. **ULT CHARGED** (violet with a bright center) means preparation has been paid for and the spell can be cast without spending more mana. **ULT COOLDOWN** and **ULT LOW MP** are grey; ended encounters show **ULT NOT READY**. The button changes from **PREPARE ULT** to **CAST ULT**. Ready/charged badges settle when the turn finishes; still images and reduced-motion mode show the resulting state immediately. The Markdown summary and local demo text show whether normal Attack is focused. Aura's mirrored badge continues to represent her existing Army Assault: ready only when Assault is next and she has 30 MP. Her combat rules are unchanged.

`hud.mjs` renders the committed state through the same health/mana snapshots as the battle. `hud-source.mjs` stores the cropped vector portraits; regenerate them with `python3 game/tools/prepare-hud.py` followed by the normal scene generator. The forest retains its full 640 × 360 dimensions beneath the HUD.

## Lettering

All visible scene labels and action-button lettering use SVG paths derived from **IM Fell DW Pica** by Igino Marini. This is a Frieren-inspired approximation of the supplied logos' old-style serif lettering, not a verified official Frieren typeface. Character names, HP/MP, charge, cooldowns, turn/encounter numbers, enemy intent, damage, and endings share the same style. Counters remain dynamic: numeric glyphs are aligned to a consistent height and given equal advance widths so values do not jump around as they change.

Glyph definitions are reused within each SVG. No installed font, external font request, embedded font file, or browser font-loading support is required. Text remains available through SVG titles/accessible labels and the existing Markdown summary. The local page's explanatory text and ordinary README prose keep their normal fonts.

The original font and SIL Open Font License are committed under `fonts/`; [font research and regeneration notes](fonts/README.md) document the source and approximation. The runtime uses only committed plain-JavaScript glyph data. Rebuilding that data uses the build-time Python `fonttools` package:

```sh
python3 game/tools/prepare-font.py
node game/generate.mjs
node game/preview.mjs
```

## Turn playback

Each accepted move plays once per image load: Frieren acts (0–0.7s), Aura's damage appears on her right (0.75–1.6s), Aura responds (1.7–2.4s), then Frieren's damage appears on her left (2.45–3.3s). The next local move unlocks at 3.4s. A killing blow skips Aura's response and settles at 1.7s. Damage of zero does not produce a floating number. Guard labels use smaller text just above and in front of the defender's head, and disappear. Guard visuals remain through the incoming hit because they protect that hit.

Aura's normal Attack summons the supplied headless halberd soldier. It takes two small steps (16 scene pixels total), keeping its body upright while the feet alternately lift and plant. The halberd's edge brightens after the steps, holds its glow for about 1.4 seconds, then fades with the soldier before her damage popup. The walking speed is unchanged. This response takes 3.4 seconds (1.7–5.1s); damage appears at 5.15s and the next move unlocks at 6.1s. Other responses keep their existing timings. Guard uses the supplied shield soldier: it takes one small step, plants its feet, and braces its shield with a restrained rim glow before the player's damage resolves. It stays through the hit, then fades. Assault commands five vector soldiers: two halberdiers closely behind three swordsmen, all at the same 1.75 scale as the individual Attack and Guard soldiers. The overlapping ranks share one small area of ground. Their short steps and weapon glows are staggered after a scales command cue. The whole formation fades before a single combined damage popup. Assault responds from 1.7–5.7s; damage appears at 5.75s and controls unlock at 6.7s. Its 30 MP cost and 10 damage remain unchanged.

The event records pre-turn health and mana. The SVG updates those values at their resolution times and uses the recorded enemy action, rather than animating the next announced intent. Old receipts without a pre-turn snapshot keep final health/mana visible. Rendering never rolls or reapplies a move. Damage popups, critical labels, attack effects, and guard barriers disappear; ambient character/forest motion and focused/prepared mana effects may remain.

The local demo locks all combat buttons during playback, starts its clock after the scene loads, and cancels pending callbacks on Reset. Reduced-motion mode shows the final state immediately, with no artificial wait. A failed image load releases controls and leaves the textual result available.

GitHub's self-contained SVG can play the same CSS timeline, but it cannot disable the separate README issue links. The README and issue result always contain the committed final state. Refreshing/reloading an SVG may replay its presentation without taking another turn. Live GitHub compatibility still needs verification after publication.

## Rules

Frieren starts with **26 HP and 240/240 MP**. Aura starts with **100 HP and 40/60 MP**. Frieren's larger reserve reflects the story; these quantities are game balance values, not canonical mana measurements. Everyone shares both resources and cooldowns.

| Action | Effect | Mana / restriction |
| --- | --- | --- |
| Attack | 5–7 damage, or 14–18 while focused. Consumes Focus. | 10 MP normally, 20 MP focused. Independent 10% critical chance; ×1.5 rounded down. |
| Guard | Reduce this turn's incoming damage to at most 1. Preserve Focus and ultimate preparation. | 15 MP. Take one other accepted turn before guarding again. |
| Focus | Restore up to 40 MP and empower the next normal Attack. | Free. Can refill while focused; the boost never stacks. Unavailable only when focused and at full MP. Does not prepare Ultimate. |
| Prepare Ult | Spend a turn preparing **Unleashed Zoltraak**; deal no damage and let Aura respond. | 80 MP, paid now. Requires zero cooldown. Preparation persists through Attack, Guard, and Focus. |
| Cast Ult | Cast the prepared spell for 32 fixed damage. Preserve Focus. | No further mana cost; no critical hit or Focus multiplier. Starts a cooldown of six other accepted turns. |

The ultimate is an adaptation of Zoltraak and Frieren's mana revelation, not an official named ultimate form. [Research and ability notes](ABILITIES.md) separate canonical abilities from game rules.

Aura's cycle is **Guard → Attack → Charge → Assault**. Guard costs 15 MP and halves all player damage, including the ultimate, rounded up. Attack deals 4 damage for free. Charge restores up to 35 MP. Assault costs 30 MP and deals 10 damage. If Aura cannot afford Guard or Assault, the announced action becomes **Recover mana**: restore 35 MP, no damage and no guard. After recovery the pattern advances normally. The UI shows the effective intent before the player acts.

Aura pays for Guard before the player's hit, because it protects that hit. Other enemy effects and costs resolve only if Aura survives. Killing blows prevent retaliation and mana recovery. Invalid moves, unavailable actions, stale links, rendering, and duplicate issue retries spend nothing and never tick cooldowns. A cooldown of 6 means six other accepted turns, with reuse possible on the following turn. Guard's cooldown is 1 under the same rule.

Victory and defeat persist until Play Again. Restart restores health and mana, clears Focus and ultimate preparation, and resets the pattern and both cooldowns, while preserving lifetime results and incrementing the encounter number. Nothing advances on a timer.

## Balance validation

Run `node game/balance.mjs` for reproducible seeded simulations (10,000 encounters per policy):

| Policy | Wins | Winning turn range | Mean winning turns |
| --- | ---: | --- | ---: |
| Prepare under Guard, cast in openings, guard assaults | 10,000 | 11–14 | 13.35 |
| Same defensive approach without ultimate | 10,000 | 15–22 | 19.91 |
| Attack repeatedly, Focus only when necessary | 0 | — | — |
| Rush Focus/Attack/Ultimate without guarding | 40 | 8 | 8.00 |

These are fixed-policy simulations, not a guarantee about every player strategy. They establish that the ultimate saves turns, remains optional, and does not make ignoring defense reliable.

## Architecture

- `engine.mjs`: pure state transitions, input validation, and injectable integer randomness.
- `frieren-source.mjs`: the supplied 128 × 96 uniform pixel SVG, partitioned into body and twin-tail layers without changing its pixel geometry or palette. `assets/frieren-original.svg` preserves the input; `assets/frieren.svg` is the compact standalone version. Regenerate with `python3 game/tools/prepare-frieren.py game/assets/frieren-original.svg`.
- `frieren.mjs`: independent one-pixel twin-tail movements, gentle breathing, and open/half-closed/closed eye frames. Attack casts a spell from her staff, Guard raises a barrier, Focus gathers teal mana, and ultimate preparation gathers violet mana. Only casting releases the ultimate beam. Both characters now use vector geometry without embedded bitmaps.
- `aura.mjs` / `aura-source.mjs`: Aura's supplied 128 × 96 uniform pixel SVG, divided into six vector layers with stepped hair/cape motion, balancing scale pans, blinking eyes, mana glow, and controlled-army effects. Aura uses two scene pixels per source pixel; Frieren uses 1.6 to balance her wider, larger-headed sprite against Aura. Her effects scale with her, and both remain grounded on the clearing. `assets/aura-original.svg` preserves the input; `assets/aura.svg` preserves its pixel geometry and palette. Regenerate the standalone asset and embedded layers with `python3 game/tools/prepare-aura.py game/assets/aura-original.svg`.
- `knight-source.mjs`: the supplied 96 × 96 true pixel halberd soldier, preserved as 2,035 vector cells across front-leg, back-leg, body, and weapon layers. Short stepped strides move the legs separately, with original joint pixels beneath them to avoid gaps. The upright body and halberd stay steady; the glow follows the blade's actual light steel pixels. `assets/knight-original.svg` preserves the input and `assets/knight.svg` is its compact vector version. Regenerate with `python3 game/tools/prepare-halberd.py`. Reduced motion omits the transient attack.
- `shield-knight-source.mjs`: the supplied 96 × 96 true pixel shield soldier, separated into front-leg, back-leg, body, and shield vector layers. It takes one short step, plants its feet, then raises its shield a pixel into the block. A purple pixel halo and light rim hold through the hit. `assets/shield-knight-original.svg` preserves the input; `assets/shield-knight.svg` is the compact standalone vector. Regenerate with `python3 game/tools/prepare-knight.py`. Both soldiers now use vector geometry with no embedded PNGs.
- `forest-source.mjs`: the supplied 320 × 180 forest, compacted into lossless pixel paths. `assets/forest-original.svg` preserves the input, and `assets/forest.svg` is the compact standalone version. Regenerate with `python3 game/tools/prepare-forest.py game/assets/forest-original.svg`.
- `art.mjs` / `render.mjs`: the full forest clearing, character composition, buttons, accessible Markdown, and issue URLs. Leaf highlights sway, sunlight changes gently, and pollen drifts behind the fighters. Frieren breathes, blinks, and sways her hair; turn effects play in sequence and disappear; charged-idle mana effects pulse slowly. Reduced-motion mode displays complete still poses and scenery.
- `army.mjs` / `sword-knight-source.mjs`: five independently animated army instances reuse two sets of vector layer definitions. Sword artwork is preserved in `assets/sword-knight-original.svg`, with a compact standalone `assets/sword-knight.svg`. Regenerate its 1,953 pixel cells with `python3 game/tools/prepare-sword.py`. The rear halberdiers reuse the normal Attack artwork.
- `hud.mjs` / `hud-source.mjs`: mirrored resource bars with centered values, vector portraits, the turn counter and an ultimate-readiness indicator.
- `lettering.mjs` / `font-source.mjs`: per-image glyph definitions, proportional serif labels, aligned numeric counters, SVG-path button labels, and accessible text equivalents. `tools/prepare-font.py` rebuilds the glyph outlines from the committed licensed font.
- `playback.mjs`: shared turn timings and the recorded-action playback descriptor; presentation never changes battle state.
- `generate.mjs`: writes the current state, scene, and marked README section; creates initial assets locally.
- `process.mjs`: persistence-first move handling with durable duplicate detection and up to three commit attempts.
- `github.mjs`: GitHub API feedback and Git persistence in a disposable Actions checkout only.
- `state.json`: current versioned state. `events.jsonl`: append-only accepted-move receipts, including issue number, actor, random outcomes, and resulting revision.

State version 4 adds `ultimatePrepared`. The legacy `charged` field now means only the Focus boost for normal Attack. Upgrading a version 3 save preserves HP, MP, Focus, cooldowns, results, and history, sets `ultimatePrepared: false`, and increments the revision once so links from the old rules must refresh. Versions 1/2 first migrate mana/HP as before. The migration is idempotent and does not rewrite event receipts or apply a battle turn. New ultimate receipts include `ultimatePhase: prepare|cast`, resource changes, and resulting preparation state, so retrying preparation cannot cast or spend twice. Pre-turn HP/MP snapshots continue to drive playback.

Only the content between `<!-- README-RAID:START -->` and `<!-- README-RAID:END -->` is regenerated. Missing or duplicated markers after insertion fail closed. The initial insertion uses the existing technology-section heading as its anchor.

Issues use `raid|<encounter>|<revision>|<action>`. Links carry the exact visible turn, so simultaneous submissions cannot unexpectedly act on a later turn. Only the first persisted move for a revision is accepted. User commands are parsed as data; no issue title or body is executed as shell code.

The Actions concurrency group uses `queue: max`, with no in-progress cancellation. GitHub currently permits up to 100 queued runs; additional submissions may need a manual retry. Ordinary issues, pull requests, and bots do not play. Editing or reopening an issue does not automatically trigger another run.

Moves are committed atomically with the scene, README, and event log before feedback is posted. If feedback fails, rerunning the same issue repairs its existing bot comment and closes it without replaying the move. Image URLs contain the global revision to reduce cache reuse, but GitHub image propagation can still lag. The Markdown status and issue result provide the textual state.

## Enable on GitHub

1. Publish the game files and both raid workflows on the repository's default branch. The included game state starts at encounter 1, revision 0.
2. Ensure Issues and GitHub Actions are enabled. Allow the official `actions/checkout` and `actions/setup-node` actions used by the workflows.
3. The game workflow requests `contents: write` and `issues: write` through the built-in `GITHUB_TOKEN`. Repository or organization policy must permit these permissions and bot pushes to the default branch. If rules require pull requests for every change, adjust the policy deliberately before enabling the game.
4. Wait for **README Raid checks** to pass, then choose Focus from the profile README and submit the prefilled issue.
5. Verify that **README Raid** commits revision 1, posts a result, closes the issue, and updates the profile after refresh.

The check workflow has read-only permissions. No personal token or secret setup is needed under the supported repository policy. Existing profile content and the snake workflow are not modified by the game.

## Live acceptance checklist

Local tests and previews do not prove GitHub rendering or repository permissions. After publication, verify:

- Complete a win by focusing during openings, attacking when focused, and guarding the assault; confirm the victory scene persists.
- Check mana spending/recovery, ultimate prerequisites and six-turn cooldown, and rejection of consecutive Guards. Confirm unavailable README controls are not links.
- Restart, then attack repeatedly to reach defeat; verify the defeat scene and restart again.
- Submit an old turn URL; confirm it closes with a refresh message and makes no game commit.
- Submit two actions for the same revision; only one may advance the game.
- Rerun a processed issue; confirm there is no second move or duplicate result comment.
- Inspect the actual profile at desktop and mobile sizes, in light/dark themes, and with reduced motion enabled. Check image freshness, all action links, and the still-image appearance.

These are real public game turns and will appear in the issue history and lifetime results.

## Recovery

Open **Actions → README Raid → Run workflow**, select the default branch, and enter the game issue number. This retries a missed run, failed push, or missing acknowledgment. Refresh the profile for a new action if the original turn is now stale. Do not edit the event log or decrement revisions to replay an issue.

Failed workflow runs and still-open game issues are the operational signals. A persistence failure leaves the issue open; the job log reports the failure without dumping tokens or authenticated remote URLs. Missing/corrupt state, log revision mismatch, and malformed README markers stop processing rather than resetting a live battle.

To stop the game, disable the **README Raid** workflow. To remove the visible section, delete its entire marked region; preserve state and event history if the game may return.
