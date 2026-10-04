# README Raid

A shared, asynchronous Frieren-versus-Aura battle for this GitHub profile. The game uses plain JavaScript, supplied character artwork composed into SVG scenes, GitHub Issues, and GitHub Actions. No hosted server, database, personal access token, or runtime dependencies are required.

## Local commands

Use Node.js 24 or later, from the repository root:

```sh
node game/local.mjs
```

Open **http://127.0.0.1:4173** to play immediately. Attack, Guard, Charge, Ultimate, mana, cooldowns, critical hits, endings, and Play Again use the real battle engine and SVG renderer. Each attack gets fresh random rolls; the result also shows its damage calculation. The demo keeps its state only in the browser tab. Refresh or choose Reset demo to start over. It never writes the saved game, makes commits, or contacts GitHub. Stop the server with Ctrl+C. If the port is busy, use `PORT=4174 node game/local.mjs`.

This tests gameplay and artwork locally; GitHub issue handling and Actions still need separate live verification.

Other commands:

```sh
node --test game/test/*.test.mjs
node game/generate.mjs
node game/preview.mjs
```

Open `game/preview/index.html` to inspect the ready, charged, attacking, guarding, critical, victory, defeat, Aura charge, and Aura assault, ultimate, and depleted-mana states at 640px and 320px. Preview files are ignored by Git. Browser motion and theme preferences apply to the preview. Rendering never advances the game or rolls damage.

The scene is 640 × 624: a 152-pixel status band, the full 640 × 360 forest battlefield, and a 112-pixel intent/cooldown band. At 320px wide it scales to 320 × 312. The supplied background keeps its original 16:9 proportions; the battlefield is not cropped or stretched into a narrow strip.

`game/generate.mjs` defaults to this repository and `main` for local rendering. For a different repository or default branch:

```sh
GITHUB_REPOSITORY=owner/profile DEFAULT_BRANCH=trunk node game/generate.mjs
```

## Turn playback

Each accepted move plays once per image load: Frieren acts (0–0.7s), Aura's damage appears on her right (0.75–1.6s), Aura responds (1.7–2.4s), then Frieren's damage appears on her left (2.45–3.3s). The next local move unlocks at 3.4s. A killing blow skips Aura's response and settles at 1.7s. Damage of zero does not produce a floating number. Guard labels use smaller text just above and in front of the defender's head, and disappear. Guard visuals remain through the incoming hit because they protect that hit.

Aura's normal Attack summons the supplied headless halberd soldier. It takes two small steps (16 scene pixels total), keeping its body upright while the feet alternately lift and plant. The halberd's edge glows briefly, then the soldier fades out before her damage popup. This response takes 2.2 seconds (1.7–3.9s); damage appears at 3.95s and the next move unlocks at 4.9s. Other responses keep their existing timings. Guard uses the supplied shield soldier: it takes one small step, plants its feet, and braces its shield with a restrained rim glow before the player's damage resolves. It stays through the hit, then fades. Assault retains its existing army effect.

The event records pre-turn health and mana. The SVG updates those values at their resolution times and uses the recorded enemy action, rather than animating the next announced intent. Old receipts without a pre-turn snapshot keep final health/mana visible. Rendering never rolls or reapplies a move. Damage popups, critical labels, attack effects, and guard barriers disappear; ambient character/forest motion and a ready-charge aura may remain.

The local demo locks all combat buttons during playback, starts its clock after the scene loads, and cancels pending callbacks on Reset. Reduced-motion mode shows the final state immediately, with no artificial wait. A failed image load releases controls and leaves the textual result available.

GitHub's self-contained SVG can play the same CSS timeline, but it cannot disable the separate README issue links. The README and issue result always contain the committed final state. Refreshing/reloading an SVG may replay its presentation without taking another turn. Live GitHub compatibility still needs verification after publication.

## Rules

Frieren starts with **26 HP and 240/240 MP**. Aura starts with **100 HP and 40/60 MP**. Frieren's larger reserve reflects the story; these quantities are game balance values, not canonical mana measurements. Everyone shares both resources and cooldowns.

| Action | Effect | Mana / restriction |
| --- | --- | --- |
| Attack | 5–7 damage, or 14–18 while charged. Consumes charge. | 10 MP normally, 20 MP charged. Independent 10% critical chance; ×1.5 rounded down. |
| Guard | Reduce this turn's incoming damage to at most 1. Preserve charge. | 15 MP. Take one other accepted turn before guarding again. |
| Charge | Restore up to 40 MP and prepare one charged Attack or Ultimate. | Free. Can refill mana while already charged; the damage boost never stacks. Unavailable only when already charged and at full MP. |
| Ultimate | **Unleashed Zoltraak**, 32 fixed damage. Requires and consumes charge. | 80 MP; no critical hit or extra charge multiplier. Six other accepted turns before reuse. |

The ultimate is an adaptation of Zoltraak and Frieren's mana revelation, not an official named ultimate form. [Research and ability notes](ABILITIES.md) separate canonical abilities from game rules.

Aura's cycle is **Guard → Attack → Charge → Assault**. Guard costs 15 MP and halves all player damage, including the ultimate, rounded up. Attack deals 4 damage for free. Charge restores up to 35 MP. Assault costs 30 MP and deals 10 damage. If Aura cannot afford Guard or Assault, the announced action becomes **Recover mana**: restore 35 MP, no damage and no guard. After recovery the pattern advances normally. The UI shows the effective intent before the player acts.

Aura pays for Guard before the player's hit, because it protects that hit. Other enemy effects and costs resolve only if Aura survives. Killing blows prevent retaliation and mana recovery. Invalid moves, unavailable actions, stale links, rendering, and duplicate issue retries spend nothing and never tick cooldowns. A cooldown of 6 means six other accepted turns, with reuse possible on the following turn. Guard's cooldown is 1 under the same rule.

Victory and defeat persist until Play Again. Restart restores health, mana, charge, the pattern, and both cooldowns, while preserving lifetime results and incrementing the encounter number. Nothing advances on a timer.

## Balance validation

Run `node game/balance.mjs` for reproducible seeded simulations (10,000 encounters per policy):

| Policy | Wins | Winning turn range | Mean winning turns |
| --- | ---: | --- | ---: |
| Charge openings, use ultimate, guard assaults | 10,000 | 13–15 | 14.57 |
| Same defensive approach without ultimate | 10,000 | 15–22 | 19.91 |
| Attack repeatedly, recharge only when necessary | 0 | — | — |
| Rush charge/attack/ultimate without guarding | 40 | 8 | 8.00 |

These are fixed-policy simulations, not a guarantee about every player strategy. They establish that the ultimate saves turns, remains optional, and does not make ignoring defense reliable.

## Architecture

- `engine.mjs`: pure state transitions, input validation, and injectable integer randomness.
- `frieren-source.mjs`: the supplied 128 × 96 uniform pixel SVG, partitioned into body and twin-tail layers without changing its pixel geometry or palette. `assets/frieren-original.svg` preserves the input; `assets/frieren.svg` is the compact standalone version. Regenerate with `python3 game/tools/prepare-frieren.py game/assets/frieren-original.svg`.
- `frieren.mjs`: independent one-pixel twin-tail movements, gentle breathing, and open/half-closed/closed eye frames. Attack casts a spell from her staff, Guard raises a barrier, and Charge gathers mana. Both characters now use vector geometry without embedded bitmaps.
- `aura.mjs` / `aura-source.mjs`: Aura's supplied 128 × 96 uniform pixel SVG, divided into six vector layers with stepped hair/cape motion, balancing scale pans, blinking eyes, mana glow, and controlled-army effects. Aura uses two scene pixels per source pixel; Frieren uses 1.6 to balance her wider, larger-headed sprite against Aura. Her effects scale with her, and both remain grounded on the clearing. `assets/aura-original.svg` preserves the input; `assets/aura.svg` preserves its pixel geometry and palette. Regenerate the standalone asset and embedded layers with `python3 game/tools/prepare-aura.py game/assets/aura-original.svg`.
- `knight-source.mjs`: the supplied halberd soldier from `assets/knight-original.svg`. This particular SVG wraps a transparent PNG; its original image bytes are preserved and embedded once in scenes that play Aura's Attack, with no external requests. Regenerate with `python3 game/tools/prepare-knight.py`. SVG clips isolate the feet for alternating steps while a mask preserves the stationary body and weapon. The upright soldier stops, its halberd edge glows, and it disappears. Reduced motion omits the transient attack.
- `shield-knight-source.mjs`: the supplied shield soldier from `assets/shield-knight-original.svg`, preserving its embedded PNG. Its feet take one short step while the upright shield pose settles into a block. Regenerate with `python3 game/tools/prepare-knight.py game/assets/shield-knight-original.svg shield`.
- `forest-source.mjs`: the supplied 320 × 180 forest, compacted into lossless pixel paths. `assets/forest-original.svg` preserves the input, and `assets/forest.svg` is the compact standalone version. Regenerate with `python3 game/tools/prepare-forest.py game/assets/forest-original.svg`.
- `art.mjs` / `render.mjs`: the full forest clearing, character composition, buttons, accessible Markdown, and issue URLs. Leaf highlights sway, sunlight changes gently, and pollen drifts behind the fighters. Frieren breathes, blinks, and sways her hair; turn effects play in sequence and disappear; charged-idle mana effects pulse slowly. Reduced-motion mode displays complete still poses and scenery.
- `playback.mjs`: shared turn timings and the recorded-action playback descriptor; presentation never changes battle state.
- `generate.mjs`: writes the current state, scene, and marked README section; creates initial assets locally.
- `process.mjs`: persistence-first move handling with durable duplicate detection and up to three commit attempts.
- `github.mjs`: GitHub API feedback and Git persistence in a disposable Actions checkout only.
- `state.json`: current versioned state. `events.jsonl`: append-only accepted-move receipts, including issue number, actor, random outcomes, and resulting revision.

State version 3 adds mana, cooldowns, and the revised HP limits. Loading versions 1/2 preserves the encounter, revision, results, and history; remaining HP is rescaled proportionally (rounded up) to the new maximum, and mana starts at the new initial values. Version 1 intent positions first map to Guard/Attack/Assault. Existing event receipts remain untouched. New receipts include mana spent/restored, resulting mana and cooldowns, and actual enemy intent, and a pre-turn health/mana snapshot for playback.

Only the content between `<!-- README-RAID:START -->` and `<!-- README-RAID:END -->` is regenerated. Missing or duplicated markers after insertion fail closed. The initial insertion uses the existing technology-section heading as its anchor.

Issues use `raid|<encounter>|<revision>|<action>`. Links carry the exact visible turn, so simultaneous submissions cannot unexpectedly act on a later turn. Only the first persisted move for a revision is accepted. User commands are parsed as data; no issue title or body is executed as shell code.

The Actions concurrency group uses `queue: max`, with no in-progress cancellation. GitHub currently permits up to 100 queued runs; additional submissions may need a manual retry. Ordinary issues, pull requests, and bots do not play. Editing or reopening an issue does not automatically trigger another run.

Moves are committed atomically with the scene, README, and event log before feedback is posted. If feedback fails, rerunning the same issue repairs its existing bot comment and closes it without replaying the move. Image URLs contain the global revision to reduce cache reuse, but GitHub image propagation can still lag. The Markdown status and issue result provide the textual state.

## Enable on GitHub

1. Publish the game files and both raid workflows on the repository's default branch. The included game state starts at encounter 1, revision 0.
2. Ensure Issues and GitHub Actions are enabled. Allow the official `actions/checkout` and `actions/setup-node` actions used by the workflows.
3. The game workflow requests `contents: write` and `issues: write` through the built-in `GITHUB_TOKEN`. Repository or organization policy must permit these permissions and bot pushes to the default branch. If rules require pull requests for every change, adjust the policy deliberately before enabling the game.
4. Wait for **README Raid checks** to pass, then choose Charge from the profile README and submit the prefilled issue.
5. Verify that **README Raid** commits revision 1, posts a result, closes the issue, and updates the profile after refresh.

The check workflow has read-only permissions. No personal token or secret setup is needed under the supported repository policy. Existing profile content and the snake workflow are not modified by the game.

## Live acceptance checklist

Local tests and previews do not prove GitHub rendering or repository permissions. After publication, verify:

- Complete a win by charging openings, attacking when charged, and guarding the assault; confirm the victory scene persists.
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
