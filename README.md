# RPG Battle Card Game

Local-play, client-only single-page app for a 2-player RPG card battle.

How to run tests

```bash
npm install
npm test --prefix "m:/Code/rpg-battle-card-game"
```

Manual play (in browser)

1. Open `index.html` in a browser (double-click or serve the folder with a simple HTTP server).
2. Draft characters by clicking available characters. Each player picks the configured number.
3. After the draft completes, the game auto-starts. Use the Play / Skip buttons to play cards.

Notes for developers

- The code is modularized into small modules under the project root:
  - `game-core.js` — deterministic core functions (unit-tested).
  - `app-state.js` — state and persistence (undo/redo history and localStorage).
  - `app-ui.js` — UI rendering helpers.
  - `app-actions.js` — action resolution (card effects, Absorb modal flow).
  - `app-turns.js` — turn/actor helpers (markCharUsed, endTurn, applyDamage/heal).
  - `app-modal.js` — modal element & listener helpers.
  - `app.js` — orchestration and fallback implementations when modules are not loaded.

If you plan to manually test a full game locally, serve the folder (so localStorage works reliably). For example:

```bash
cd m:/Code/rpg-battle-card-game
python -m http.server 8000
# then open http://localhost:8000 in a browser
```
# RPG Battle Card Game

A small, single-page, client-only 2-player RPG-style card battle demo.

This repository contains a lightweight browser implementation of a two-player (same-device) draft-and-battle card game. It's intended for quick playtesting: no server, no build step.

---

## Highlights

- Draft characters (players alternate picks).
- Deck generation from card templates and shuffling.
- Per-character turn flow (left-to-right). Characters can be KO'd and revived.
- Implemented card types: Attack, Attack All, Heal, Heal All, Revive, Draw, Discard, Steal, Absorb (multi-donor), Dodge, Counter.
- Persistence via localStorage with a small persisted undo/redo history (last 5 snapshots).
- Pure game-core logic split (testable via Node) and a thin browser UI.

---

## Quick start

Open `index.html` in the `rpg-battle-card-game` folder in a modern browser. No server required.

Optional local server (recommended if your browser restricts file:// access):

```bash
# serve from the project folder
python -m http.server 8000
# then visit http://localhost:8000/rpg-battle-card-game/
```

## How to play (short)

- Draft: take turns picking characters from the available pool (default 3 picks each).
- After drafting, the deck is shuffled and each player is dealt 5 cards.
- On your turn, each active character (left-to-right) may play one card (or skip if truly unable to play).
- At end of turn players draw according to the rules (draw to 5 or draw 1 if they had >=5).

## Controls

- Play a card by selecting it and then selecting a target if required.
- Bottom-right controls: `Undo`, `Redo`, `Reset` (Undo/Redo have keyboard shortcuts: Ctrl/Cmd+Z, Ctrl/Cmd+Y).
- Shortcut: `d` draws 1 card for the current player (debug shortcut).

## Developer notes

- UI files: `index.html`, `styles.css`, `app.js`
- Pure logic: `game-core.js` (Node), `game-core-browser.js` (exposes `window.gameCore`)
- Tests: run with Node

```bash
node test_game_core.js
node test_absorb.js
```

## Persistence

- Main snapshot key: `rpg_battle_state_v1`
- Persisted short history: `rpg_battle_state_v1_history_v1` (keeps last 5 snapshots)
- Undo/Redo survive reloads for those persisted steps; performing a new action after an undo clears the redo branch.

## Contributing

PRs welcome. Please keep the pure core logic testable and add/update tests if you change game rules.

---

Built for quick iteration and playtesting. If you want additional polish (animations, accessibility, more cards, or AI opponents), open an issue or send a PR.
