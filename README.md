# PROMPT RAIDERS
A browser, no-build, **offline** AI-LLM-hacking capture-the-flag game for APEX 2026.
Talk your way past 8 AI "vault guardians" using real techniques (prompt injection, jailbreak,
filter evasion, system-prompt leak, indirect injection, tool abuse, chained boss).

## Run locally
Open `index.html` in a browser, or serve: `python3 -m http.server` → open the URL. No install, no API keys.

## Deploy on GitHub Pages
Push to the repo root, enable Pages (Settings → Pages → main / root). No build step — Pages serves `index.html` directly.

## Files
- `index.html` · `css/styles.css` · `js/levels.js` (8 vaults) · `js/engine.js` (Guardian Engine + scoring) · `js/game.js` (UI/state) · `tests/run.cjs` (`node tests/run.cjs`) · `docs/` (full spec)

## Status
Tested, playable **v0 starter**. See `docs/APEX_LLM_Hacking_Lab_GAME_SPEC.md` for the full vision.
