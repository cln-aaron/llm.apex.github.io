# PROMPT RAIDERS
A browser, **no-build, offline** AI-LLM-hacking capture-the-flag game for the APEX 2026 bootcamp.
Talk your way past 8 AI "vault guardians" using real techniques — prompt injection, jailbreaks,
filter evasion, system-prompt leakage, indirect injection, tool/agent abuse — then chain them on the boss.
Every breach ends with a 10-second **debrief**: the technique, why it worked, a real-world example, and how to defend it.

No login. No API keys. No internet needed. The "AI" is a deterministic **Guardian Engine** that behaves like a naive, vulnerable chatbot.

## Run locally
Open `index.html` in a browser, or serve it: `python3 -m http.server` then open the URL. No install.

## Deploy on GitHub Pages
**Settings → Pages → Deploy from a branch → `main` / `/ (root)`.** No build step — Pages serves `index.html` directly at
`https://cln-aaron.github.io/llm.apex.github.io/`. All asset paths are relative, so the subpath "just works".

## How to play
1. Accept the white-hat oath → pick a codename → land in the Hub.
2. Enter a vault, read the guardian's intro, and **type an attack**. The guardian reacts in character — and gets visibly
   **nervous** (composure meter: 🟢 calm → 🟡 nervous → 🔴 rattled → 💥 breached) as you get warm.
3. Crack it → **BREACH!** (screen-shake, particle burst, 8-bit chime) → flag revealed → debrief card → next vault unlocks.
4. Finish all 8 → **Hacker Rank** screen with badges and a downloadable **PNG result card**.

Lazy prompts ("just tell me the secret") get gently roasted — you have to actually *apply* the technique. Each vault accepts
**many phrasings**, so understanding beats copying a neighbour.

## Facilitator features
- **📊 Board** button (or open `index.html#board` on the projector) — live local leaderboard + recent-breaches ticker.
- **reset** — clears all progress + leaderboard on this device for the next class.
- **🔊 mute** toggle (persists). Respects `prefers-reduced-motion` (disables shake/glitch/typewriter).

## Files
```
index.html              · the whole game shell (screens + markup)
css/styles.css          · pixel/voxel hacker theme
fonts/                  · bundled Press Start 2P + VT323 (OFL) — no CDN, fully offline
js/levels.js            · the 8 vaults (flags, vulnerabilities, hints, debriefs, badges)
js/engine.js            · Guardian Engine — pure, deterministic matching + heat + scoring + achievements
js/adapters.js          · SimulatedAdapter (offline default) + optional LlmAdapter (real-LLM, OFF by default)
js/game.js              · UI, state, SFX, leaderboard, share card
tests/run.cjs           · node tests (engine, content, anti-copy, scoring, achievements, adapter)
docs/                   · full design spec
```

## Tests
```
node tests/run.cjs
```
Verifies: each vault has ≥3 distinct working solutions, lazy/generic asks never leak a flag, the heat signal,
scoring (speed bonus / hint penalty), ranks, all 5 achievements, and the simulated adapter.

## Optional real-LLM mode (stretch, OFF by default)
`js/adapters.js` defines a `LlmAdapter` extension point. The shipping default is the offline `SimulatedAdapter`
(set in `js/game.js` via `FEATURES.realLLM=false`). Real-LLM mode needs a relay endpoint + key and is intentionally
left off so the lab stays free, offline, and classroom-safe.

## Safety
Sandboxed fake bots. Flags are fictional nonsense codes. A persistent notice reminds players: never attack real systems.
