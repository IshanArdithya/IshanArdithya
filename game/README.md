# README Raid

A shared, asynchronous Frieren-versus-Aura battle for this GitHub profile. The game uses plain JavaScript, supplied character artwork composed into SVG scenes, GitHub Issues, and GitHub Actions. No hosted server, database, personal access token, or runtime dependencies are required.

## Local commands

Use Node.js 24 or later, from the repository root:

```sh
node game/local.mjs
```

Open **http://127.0.0.1:4173** to play immediately. Attack, Guard, Charge, critical hits, endings, and Play Again use the real battle engine and SVG renderer. Each attack gets fresh random rolls; the result also shows its damage calculation. The demo keeps its state only in the browser tab. Refresh or choose Reset demo to start over. It never writes the saved game, makes commits, or contacts GitHub. Stop the server with Ctrl+C. If the port is busy, use `PORT=4174 node game/local.mjs`.

This tests gameplay and artwork locally; GitHub issue handling and Actions still need separate live verification.

Other commands:

```sh
node --test game/test/*.test.mjs
node game/generate.mjs
node game/preview.mjs
```

Open `game/preview/index.html` to inspect the ready, charged, attacking, guarding, critical, victory, defeat, Aura charge, and Aura assault states at 640px and 320px. Preview files are ignored by Git. Browser motion and theme preferences apply to the preview. Rendering never advances the game or rolls damage.

`game/generate.mjs` defaults to this repository and `main` for local rendering. For a different repository or default branch:

```sh
GITHUB_REPOSITORY=owner/profile DEFAULT_BRANCH=trunk node game/generate.mjs
```

## Rules

Frieren begins with 24 HP; Aura begins with 60 HP. Everyone shares one hero, and consecutive turns by the same visitor are allowed.

| Action | Effect |
| --- | --- |
| Attack | Uniform integer damage from 5–7, or 14–18 while charged. Consumes charge. |
| Guard | Reduce this turn's incoming damage to at most 1. Preserve charge. |
| Charge | Prepare one charged attack. Cannot stack. Take the enemy hit normally. |

Every Attack has an independent 10% critical chance: multiply the rolled damage by 1.5 and round down. Aura repeats Guard (half damage taken), Attack (4 damage), Charge (0), and Assault (10). The player acts first, and a killing blow prevents retaliation. Invalid moves consume neither a turn nor a random roll.

Aura's Guard halves damage after the critical multiplier and rounds the remaining damage up. Charge Frieren during Aura's Guard, attack during openings, and save Guard for the Assault. The cycle is a game adaptation inspired by Aura's army and scales. [Research and next-phase ability notes](ABILITIES.md) distinguish source material from game rules for both characters.

Victory and defeat remain visible until a visitor selects Play Again. Restart resets the encounter, preserves lifetime wins/losses and the previous result, and increments the encounter number. Nothing advances on a timer.

## Architecture

- `engine.mjs`: pure state transitions, input validation, and injectable integer randomness.
- `frieren-source.mjs`: the original PNG embedded in the supplied `frieren-exact.svg`, preserved verbatim. The source SVG wraps a bitmap rather than separate vector shapes. Each battle SVG embeds the image once and needs no external image requests.
- `frieren.mjs`: SVG masks isolate the original twin tails for gentle independent movement; skin-colored overlays create open, half-closed, and closed eye frames. The base artwork is preserved. Attack casts a spell, Guard raises a barrier, and Charge gathers mana; the mechanics are unchanged.
- `aura.mjs` / `aura-source.mjs`: Aura's supplied 96 × 110 pixel SVG, divided into six vector layers with stepped hair/cape motion, balancing scale pans, blinking eyes, mana glow, and controlled-army effects. `assets/aura-original.svg` preserves the input; `assets/aura.svg` preserves its pixel geometry and palette. Regenerate the standalone asset and embedded layers with `python3 game/tools/prepare-aura.py game/assets/aura-original.svg`.
- `art.mjs` / `render.mjs`: the shrine, character composition, buttons, accessible Markdown, and issue URLs. Frieren breathes, blinks, and sways her hair; casting plays once and the barrier/mana effects pulse slowly. Reduced-motion mode displays still poses.
- `generate.mjs`: writes the current state, scene, and marked README section; creates initial assets locally.
- `process.mjs`: persistence-first move handling with durable duplicate detection and up to three commit attempts.
- `github.mjs`: GitHub API feedback and Git persistence in a disposable Actions checkout only.
- `state.json`: current versioned state. `events.jsonl`: append-only accepted-move receipts, including issue number, actor, random outcomes, and resulting revision.

State version 2 adds Aura's four-step pattern. Loading version 1 preserves health, history, counters, and revision while mapping its recovery/slash/heavy positions to Guard/Attack/Assault. Accepted attacks record rolled damage and Aura's blocked damage separately.

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
