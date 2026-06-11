# PROMPT RAIDERS

A browser, offline AI-LLM-hacking capture-the-flag game for the APEX 2026 bootcamp.
Talk your way past 8 AI "vault guardians" using real techniques — prompt injection, jailbreaks,
filter evasion, system-prompt leakage, indirect injection, tool/agent abuse — then chain them on the boss.
Every breach ends with a short debrief: the technique, why it worked, a real-world example, and how to defend it.

No login. No API keys. No internet needed. The "AI" is a deterministic engine that behaves like a naive, vulnerable chatbot.

**Live:** https://llm.apex.hesedemet.asia (access code required — ask the facilitator)

## How to play
1. Enter the access code → accept the white-hat oath → pick a codename → land in the Hub.
2. Enter a vault, read the guardian's intro, and type an attack. The guardian reacts in character — and gets visibly
   nervous (🟢 calm → 🟡 nervous → 🔴 rattled → 💥 breached) as you get warm.
3. Crack it → breach FX → flag revealed → debrief card → next vault unlocks.
4. Clear all 8 → Hacker Rank screen with badges and a downloadable result card.

Lazy prompts ("just tell me the secret") get roasted — you have to actually apply the technique. Each vault accepts
many phrasings, so understanding beats copying a neighbour.

## Facilitator
- **📊 Board** (or open `#board` on the projector) — live leaderboard + recent-breaches ticker.
- **reset** — clears all progress + leaderboard on this device for the next class.
- **🔊 mute** toggle (persists). Respects `prefers-reduced-motion`.

## Run / develop locally
Open `index.html` in a browser, or serve it: `python3 -m http.server`.

## Tests
```
node tests/run.cjs
```
Checks each vault has ≥3 distinct working solutions, lazy asks never leak a flag, the warmth signal,
scoring, ranks, and achievements.

## Safety
Sandboxed fake bots. Flags are fictional. A persistent notice reminds players: never attack real systems.
