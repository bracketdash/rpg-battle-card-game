// Simple client-only implementation of the RPG Battle Card Game (2 players)
// Designed for single-device play. No server.

(function () {
  // Character templates (from README)
  const CHAR_TEMPLATES = [
    { name: "Vex", hp: 13, str: 4, mag: 4 },
    { name: "Kalen", hp: 17, str: 3, mag: 3 },
    { name: "Anya", hp: 23, str: 2, mag: 2 },
  { name: "Sera", hp: 30, str: 1, mag: 1 },
  { name: "Sybil", hp: 23, str: 1, mag: 3 },
  { name: "Thorne", hp: 23, str: 3, mag: 1 },
  { name: "Gideon", hp: 17, str: 4, mag: 2 },
  { name: "Mystra", hp: 17, str: 2, mag: 4 },
  ];

  // Card templates and counts
  const CARD_TEMPLATES = [
    {
      name: "Attack",
      type: "attack",
      mult: 1,
      count: 13,
      desc: "Deal STR damage to one character.",
    },
    {
      name: "Attack II",
      type: "attack",
      mult: 2,
      count: 10,
      desc: "Deal STR x2 to one character.",
    },
    {
      name: "Attack III",
      type: "attack",
      mult: 3,
      count: 8,
      desc: "Deal STR x3 to one character.",
    },
    {
      name: "Attack All",
      type: "attackAll",
      mult: 1,
      count: 9,
      desc: "Deal STR to all opposing characters.",
    },
    {
      name: "Attack All II",
      type: "attackAll",
      mult: 2,
      count: 3,
      desc: "Deal STR x2 to all opposing characters.",
    },
    {
      name: "Heal",
      type: "heal",
      mult: 1,
      count: 5,
      desc: "Heal MAG HP from one character.",
    },
    { name: "Heal II", type: "heal", mult: 2, count: 3, desc: "Heal MAG x2." },
    { name: "Heal III", type: "heal", mult: 3, count: 2, desc: "Heal MAG x3." },
    {
      name: "Heal All",
      type: "healAll",
      mult: 1,
      count: 2,
      desc: "Heal MAG from all friendly characters.",
    },
    {
      name: "Heal All II",
      type: "healAll",
      mult: 2,
      count: 1,
      desc: "Heal MAG x2 from all friendly characters.",
    },
    {
      name: "Absorb",
      type: "absorb",
      mult: 1,
      count: 4,
      desc: "Move up to MAG damage from elsewhere to self.",
    },
    {
      name: "Absorb II",
      type: "absorb",
      mult: 2,
      count: 3,
      desc: "Move up to MAG x2.",
    },
    {
      name: "Absorb III",
      type: "absorb",
      mult: 3,
      count: 2,
      desc: "Move up to MAG x3.",
    },
    {
      name: "Revive",
      type: "revive",
      mult: 1,
      count: 7,
      desc: "Revive and heal up to MAG HP.",
    },
    {
      name: "Revive II",
      type: "revive",
      mult: 2,
      count: 3,
      desc: "Revive and heal up to MAG x2.",
    },
    {
      name: "Discard",
      type: "discard",
      mult: 1,
      count: 4,
      desc: "Opponent discards 1 card.",
    },
    {
      name: "Discard II",
      type: "discard",
      mult: 2,
      count: 2,
      desc: "Opponent discards 2 cards.",
    },
    {
      name: "Draw",
      type: "draw",
      mult: 1,
      count: 4,
      desc: "You may draw an additional card.",
    },
    {
      name: "Draw II",
      type: "draw",
      mult: 2,
      count: 2,
      desc: "Draw up to 2 additional cards.",
    },
    {
      name: "Steal",
      type: "steal",
      mult: 1,
      count: 3,
      desc: "Take a card from opponent hand.",
    },
    {
      name: "Dodge",
      type: "dodge",
      mult: 1,
      count: 7,
      desc: "Use when attacked to take zero damage.",
    },
    {
      name: "Counter",
      type: "counter",
      mult: 1,
      count: 3,
      desc: "Use when attacked to reverse the attack.",
    },
  ];

  // DOM refs
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const draftScreen = $("#draft-screen");
  const availableCharacters = $("#available-characters");
  const undoBtn = $("#undo-btn");
  const redoBtn = $("#redo-btn");
  const startGameBtn = $("#start-game-btn");
  const gameScreen = $("#game-screen");
  const playerPanels = [$("#player-1-panel"), $("#player-2-panel")];
  const playerCharsEl = [$("#player-1-chars"), $("#player-2-chars")];
  const handEls = [$("#hand-1"), $("#hand-2")];
  // `#current-turn` and `#next-char-name` are now unused; status bar is the single source of instructions
  const playButtons = Array.from(document.querySelectorAll(".play-selected"));
  const skipButtons = Array.from(document.querySelectorAll(".skip-action"));
  const statusEl = $("#status");

  // Use extracted state/persistence module when available. This keeps
  // `app.js` lightweight and lets us refactor persistence separately.
  const stateModule =
    typeof window !== "undefined" && window.rpgGame && window.rpgGame.stateModule
      ? window.rpgGame.stateModule
      : null;

  // Game state reference (either from the module or a local fallback)
  const state = stateModule
    ? stateModule.state
    : {
        players: [createEmptyPlayer(1), createEmptyPlayer(2)],
        draftPool: [],
        draftTurn: 0,
        draftPicksPerPlayer: 3,
        deck: [],
        discard: [],
        currentPlayer: 0,
        nextCharIndex: 0,
        selectedCardIdx: null,
        selectedTarget: null,
  isDraft: false,
  statusText: '',
  gameOver: false,
  uiLocked: false,
      };

  // Helpers
  function createEmptyPlayer(num) {
    return {
      id: num,
      chars: [],
      hand: [],
      usedThisTurn: [],
      name: `Player ${num}`,
    };
  }

  function log(msg) {
    // Log to console instead of an on-page log area. Keep a concise timestamp for readability.
    try {
      console.log(`[${new Date().toLocaleTimeString().slice(3)}] ${msg}`);
    } catch (e) {}
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // Deck build
  function buildDeck() {
    const deck = [];
    CARD_TEMPLATES.forEach((t) => {
      for (let i = 0; i < t.count; i++) deck.push(Object.assign({}, t));
    });
    shuffle(deck);
    return deck;
  }

  // Draft
  function startDraft() {
    state.draftPool = CHAR_TEMPLATES.map((c) => Object.assign({}, c));
    state.draftTurn = 0; // player 1 picks first
    // Ensure player panels are visible while drafting but hide hand areas
    setDraftModeUI(true);
    renderDraft();
  }

  function renderDraft() {
    if (typeof window !== 'undefined' && window.rpgGame && window.rpgGame.uiModule && typeof window.rpgGame.uiModule.renderDraft === 'function') {
      return window.rpgGame.uiModule.renderDraft();
    }
    let picksLeft = 0;
    try {
      // Defensive: ensure draftPool exists (helps when reloads leave state empty)
      if (!state.draftPool || !state.draftPool.length) {
        state.draftPool = CHAR_TEMPLATES.map((c) => Object.assign({}, c));
        state.draftTurn = 0;
      }
      // ensure the available characters area is visible
      try {
        // force the available pool to use the same flex layout as other grids
        availableCharacters.style.display = "flex";
        availableCharacters.style.flexWrap = "wrap";
      } catch (e) {}
      availableCharacters.innerHTML = "";
      // how many picks this player has left
      const picksLeftRaw =
        state.draftPicksPerPlayer - state.players[state.draftTurn].chars.length;
      picksLeft = Math.max(0, picksLeftRaw);
      state.draftPool.forEach((c, idx) => {
        const el = document.createElement("div");
        el.className = "char-card";
        // only mark clickable if current drafter still has picks left and UI is not locked
        if (picksLeft > 0 && !state.uiLocked) {
          el.classList.add("clickable");
          el.addEventListener("click", () => pickChar(idx));
        }
        el.innerHTML = `<div class="name">${c.name}</div>
        <div class="small-meta">HP ${c.hp} • STR ${c.str} • MAG ${c.mag}</div>`;
        availableCharacters.appendChild(el);
      });
      // Ensure player panels are visible (in case some earlier step hid them)
      try {
        document.querySelectorAll('.player-panel').forEach((pp) => {
          pp.style.display = '';
        });
      } catch (e) {}
      // Debug output to console to help trace initialization issues
      try {
        console.debug('renderDraft: draftPool=', state.draftPool.length, 'draftTurn=', state.draftTurn, 'picksP0=', state.players[0].chars.length, 'picksP1=', state.players[1].chars.length);
      } catch (e) {}
    } catch (err) {
      console.error('renderDraft failed', err);
      // fallback: attempt a minimal repopulation so the user can still pick
      try {
        state.draftPool = CHAR_TEMPLATES.map((c) => Object.assign({}, c));
        availableCharacters.innerHTML = "";
        state.draftPool.forEach((c, idx) => {
          const el = document.createElement('div');
            el.className = 'char-card';
            if (!state.uiLocked) {
              el.classList.add('clickable');
              el.addEventListener('click', () => pickChar(idx));
            }
          el.innerHTML = `<div class="name">${c.name}</div><div class="small-meta">HP ${c.hp} • STR ${c.str} • MAG ${c.mag}</div>`;
          availableCharacters.appendChild(el);
        });
      } catch (e) {
        console.error('renderDraft fallback failed', e);
      }
    }
  if (statusEl) statusEl.textContent = `${state.players[state.draftTurn].name}, pick a character (${picksLeft} picks left)`;
    // Also populate the draft-specific pick lists so users who are looking
    // at the Draft screen see the picks in the familiar place. We still
    // populate the main player character panels so the DOM remains
    // consistent into game mode.
    const drafted1 = $("#drafted-1");
    const drafted2 = $("#drafted-2");
    if (drafted1) drafted1.innerHTML = "";
    if (drafted2) drafted2.innerHTML = "";
    state.players[0].chars.forEach((c) => {
      const el = document.createElement("div");
      el.className = "char-card";
      el.innerHTML = `<div class="name">${c.name}</div><div class="small-meta">HP ${c.maxHP} • STR ${c.str} • MAG ${c.mag}</div>`;
      if (drafted1) drafted1.appendChild(el);
    });
    state.players[1].chars.forEach((c) => {
      const el = document.createElement("div");
      el.className = "char-card";
      el.innerHTML = `<div class="name">${c.name}</div><div class="small-meta">HP ${c.maxHP} • STR ${c.str} • MAG ${c.mag}</div>`;
      if (drafted2) drafted2.appendChild(el);
    });
    // Also populate the main player character containers so their positions don't jump when switching to game view
    try {
      if (playerCharsEl[0]) {
        playerCharsEl[0].innerHTML = "";
        state.players[0].chars.forEach((c) => {
          const el = document.createElement("div");
          el.className = "char-card";
          el.innerHTML = `<div class="name">${c.name}</div><div class="small-meta">HP ${c.maxHP} • STR ${c.str} • MAG ${c.mag}</div>`;
          playerCharsEl[0].appendChild(el);
        });
      }
      if (playerCharsEl[1]) {
        playerCharsEl[1].innerHTML = "";
        state.players[1].chars.forEach((c) => {
          const el = document.createElement("div");
          el.className = "char-card";
          el.innerHTML = `<div class="name">${c.name}</div><div class="small-meta">HP ${c.maxHP} • STR ${c.str} • MAG ${c.mag}</div>`;
          playerCharsEl[1].appendChild(el);
        });
      }
    } catch (e) {}
    const totalPicked =
      state.players[0].chars.length + state.players[1].chars.length;
    // hide start button during active drafting; only enable/show when ready
    if (totalPicked === state.draftPicksPerPlayer * 2) {
      startGameBtn.disabled = false;
      startGameBtn.style.display = "";
    } else {
      startGameBtn.disabled = true;
      startGameBtn.style.display = "none";
    }
  }

  function pickChar(idx) {
    // Remove the picked character from the pool and add to the current drafter.
    const char = state.draftPool.splice(idx, 1)[0];
    const charInstance = Object.assign({}, char, {
      maxHP: char.hp,
      hp: char.hp,
      isKO: false,
    });
    const pickedBy = state.draftTurn;
    state.players[pickedBy].chars.push(charInstance);
  // Immediately show the picked card in the UI (no turn switch yet)
  // Lock UI interactions briefly so users can't click during the animation/transition
  state.uiLocked = true;
  saveState();
  renderDraft();
    log(`${state.players[pickedBy].name} drafted ${charInstance.name}`);

    // After a short delay, either start the game if drafting finished, or switch to the next drafter.
    const totalPicked =
      state.players[0].chars.length + state.players[1].chars.length;
    setTimeout(() => {
      // Unlock UI before handling next steps so renderers can re-enable clickability
      state.uiLocked = false;
      saveState();
      if (totalPicked >= state.draftPicksPerPlayer * 2) {
        // Draft complete — start game. The last drafter (pickedBy) will be the starter.
        // startGame reads state.draftTurn to set starting player, so set it appropriately.
        state.draftTurn = pickedBy; // remember last drafter
        saveState();
        startGame();
        return;
      }
      // Not finished: switch to the other drafter and re-render.
      state.draftTurn = 1 - pickedBy;
      saveState();
      renderDraft();
    }, 300);
  }

  // Start game after drafting
  function startGame() {
    // reset hands, build deck and deal
    state.deck = buildDeck();
    state.discard = [];
    state.players.forEach((p) => {
      p.hand = [];
      p.usedThisTurn = [];
      // clear any flags on characters
      p.chars.forEach((c) => {
        c.dodge = false;
        c.counter = false;
      });
    });
    // deal 5 each
    for (let i = 0; i < 5; i++) {
      state.players.forEach((p) => drawCardTo(p));
    }
    // If draft just finished, the last drafter should start first. Our draftTurn was flipped after their pick,
    // so the last drafter index is 1 - state.draftTurn.
    state.currentPlayer =
      typeof state.draftTurn === "number" ? 1 - state.draftTurn : 0;
    state.nextCharIndex = 0;
    // exit draft-mode UI and show hands/controls
    draftScreen.classList.add("hidden");
    setDraftModeUI(false);
    gameScreen.classList.remove("hidden");
    updateUI();
    log("Game started. Deck shuffled and 5 cards dealt each.");
    saveState();
  }

  function drawCardTo(player, n = 1) {
    for (let i = 0; i < n; i++) {
      if (state.deck.length === 0) {
        // reshuffle discard
        state.deck = state.discard.splice(0);
        shuffle(state.deck);
      }
      const c = state.deck.shift();
      if (c) player.hand.push(c);
    }
    saveState();
  }

  function updateStatus(text) {
    statusEl.textContent = text;
      try {
        if (state) state.statusText = text;
      } catch (e) {}
  }

  // UI rendering
  function updateUI() {
    // Move concise instruction into the top-right status and clear the smaller panel labels
  renderPlayers();
  renderHands();
  // renderNextChar intentionally no-op now (we show actor info in the top-right status)
  try { if (typeof window !== 'undefined' && window.rpgGame && window.rpgGame.uiModule && typeof window.rpgGame.uiModule.renderNextChar === 'function') window.rpgGame.uiModule.renderNextChar(); } catch (e) {}
    evaluateSkipVisibility();
    // prefer explicit statusText from state (restored from snapshot) when present
    // Otherwise show a concise instruction telling the current player which character to act with.
    let statusText = state.statusText && state.statusText.length ? state.statusText : null;
    if (!statusText) {
      const p = state.players[state.currentPlayer];
      // determine next available actor
      let idx = state.nextCharIndex;
      while (idx < p.chars.length && (p.chars[idx].isKO || p.usedThisTurn.includes(idx))) idx++;
      if (idx >= p.chars.length) {
        statusText = `${p.name}: No available actors — end your turn.`;
      } else {
        const actorName = p.chars[idx].name;
        statusText = `${p.name}: Choose an action for ${actorName}`;
      }
    }
    updateStatus(statusText);
  // clear the secondary next-char display (we now show it in the status)
  // legacy DOM nodes like `#next-char-name` are optional; update them only if present
  try { const _n = document.querySelector('#next-char-name'); if (_n) _n.textContent = ''; } catch (e) {}
    // visually mark active player panel with animation
    setActivePlayerVisual(state.currentPlayer);
    // enable/disable per-player play buttons so only the active player's control is usable
    playButtons.forEach((b) => {
      try {
        b.disabled = Number(b.dataset.player) !== state.currentPlayer;
      } catch (e) {}
    });
  }

  // Determine whether the Skip Action button should be visible: only when the current actor
  // has no playable cards for this actor. Otherwise hide it.
  function evaluateSkipVisibility() {
    if (typeof window !== 'undefined' && window.rpgGame && window.rpgGame.uiModule && typeof window.rpgGame.uiModule.evaluateSkipVisibility === 'function') {
      return window.rpgGame.uiModule.evaluateSkipVisibility();
    }
    const p = state.players[state.currentPlayer];
    // find current actor index
    let idx = state.nextCharIndex;
    while (
      idx < p.chars.length &&
      (p.chars[idx].isKO || p.usedThisTurn.includes(idx))
    )
      idx++;
    const actor = p.chars[idx];
    if (!actor) {
      // hide skip buttons for both players
      skipButtons.forEach((b) => (b.style.display = "none"));
      return;
    }
    // if any card in hand is playable for this actor, hide skip
    const playable = p.hand.some((card) =>
      isCardPlayable(card, { player: state.currentPlayer, actorIdx: idx }),
    );
    // show skip-action only for current player when they literally cannot play
    skipButtons.forEach((b) => {
      const playerIndex = Number(b.dataset.player);
      if (playerIndex === state.currentPlayer) b.style.display = playable ? "none" : "";
      else b.style.display = "none";
    });
    // If the current actor cannot play any cards, surface a clear status message
    try {
      if (!playable) {
        updateStatus(`${p.name}: No actions available. Press Pass button.`);
      }
    } catch (e) {}
  }

  function isCardPlayable(card, ctx) {
    // ctx: { player: sideIndex, actorIdx }
    const actor = state.players[ctx.player].chars[ctx.actorIdx];
    const opp = state.players[1 - ctx.player];
    const team = state.players[ctx.player];
    switch (card.type) {
      case "attack":
      case "attackAll":
        return opp.chars.some((ch) => !ch.isKO);
      case "heal":
        return team.chars.some((ch) => !ch.isKO && ch.hp < ch.maxHP);
      case "healAll":
        return team.chars.some((ch) => !ch.isKO && ch.hp < ch.maxHP);
      case "revive":
        return team.chars.some((ch) => ch.isKO);
      case "draw":
        return true;
      case "discard":
        return opp.hand && opp.hand.length > 0;
      case "steal":
        return opp.hand && opp.hand.length > 0;
      case "absorb":
        // donors: any other char (either side) with damage > 0
        return state.players.some((pl, side) =>
          pl.chars.some((ch, ci) => {
            if (side === ctx.player && ci === ctx.actorIdx) return false;
            return !ch.isKO && ch.maxHP - ch.hp > 0;
          }),
        );
      default:
        return false;
    }
  }

  function setActivePlayerVisual(idx) {
    if (typeof window !== 'undefined' && window.rpgGame && window.rpgGame.uiModule && typeof window.rpgGame.uiModule.setActivePlayerVisual === 'function') {
      return window.rpgGame.uiModule.setActivePlayerVisual(idx);
    }
    // remove active from both then add
    playerPanels.forEach((el, i) => {
      el.classList.remove("active");
      el.classList.remove("pulse");
    });
    const el = playerPanels[idx];
    if (!el) return;
    // add then force reflow to retrigger animation
    el.classList.add("active");
    void el.offsetWidth; // reflow
    el.classList.add("pulse");
  }

  function renderPlayers() {
    if (typeof window !== 'undefined' && window.rpgGame && window.rpgGame.uiModule && typeof window.rpgGame.uiModule.renderPlayers === 'function') {
      return window.rpgGame.uiModule.renderPlayers();
    }
    for (let i = 0; i < 2; i++) {
      const p = state.players[i];
      const el = playerCharsEl[i];
      el.innerHTML = "";
      p.chars.forEach((c, idx) => {
        const classes = ["char-card"];
        if (c.isKO) classes.push("ko");
        // mark used characters visually
        if (
          state.players[i].usedThisTurn &&
          state.players[i].usedThisTurn.includes(idx)
        )
          classes.push("used");
        // mark current actor for the active player
        if (i === state.currentPlayer) {
          let nextIdx = state.nextCharIndex;
          while (
            nextIdx < p.chars.length &&
            (p.chars[nextIdx].isKO || p.usedThisTurn.includes(nextIdx))
          )
            nextIdx++;
          if (nextIdx === idx) classes.push("current-actor");
        }
        const ce = document.createElement("div");
        ce.className = classes.join(" ");
        const usedBadge =
          state.players[i].usedThisTurn &&
          state.players[i].usedThisTurn.includes(idx)
            ? '<span class="flag-badge">USED</span>'
            : "";
        // calculate HP percentage for the visual HP bar
        const hpPercent = Math.max(
          0,
          Math.round(((c.hp || 0) / (c.maxHP || 1)) * 100),
        );
        ce.innerHTML =
          `<div class="name">${c.name}${c.isKO ? '<span class="ko-badge">KO</span>' : ""}${usedBadge}</div>
          <div class="hp">
            <div class="hp-text">HP: ${c.hp}/${c.maxHP}</div>
            <div class="hp-bar"><div class="hp-fill" style="width:${hpPercent}%;"></div></div>
          </div>
          <div class="small-meta">STR ${c.str} • MAG ${c.mag}` +
          `${c.dodge ? '<span class="flag-badge">DODGE</span>' : ""}${c.counter ? '<span class="flag-badge">COUNTER</span>' : ""}</div>`;
        el.appendChild(ce);
      });
    }
  }
  
  // Toggle UI when in draft mode vs game mode. During draft mode we keep the
  // main player panels visible (so drafted characters appear in-place) but
  // hide hand areas and turn controls. When exiting draft mode we restore
  // visibility of hands/controls.
  function setDraftModeUI(isDraft) {
    if (typeof window !== 'undefined' && window.rpgGame && window.rpgGame.uiModule && typeof window.rpgGame.uiModule.setDraftModeUI === 'function') {
      return window.rpgGame.uiModule.setDraftModeUI(isDraft);
    }
    try {
      if (isDraft) {
        // show draft screen and keep game panels visible
        draftScreen.classList.remove("hidden");
        gameScreen.classList.remove("hidden");
        // hide the hand areas and per-player turn controls
        document.querySelectorAll(".hand-area").forEach((el) => {
          el.style.display = "none";
        });
        document.querySelectorAll(".turn-controls").forEach((el) => {
          el.style.display = "none";
        });
        // hide the draft-specific stacked player panels so we only show the
        // shared player panels (which we populate) — this keeps layout
        // identical between draft and game modes.
        const dp = document.querySelector('.draft-players');
        if (dp) dp.style.display = 'none';
  // top controls removed from DOM; nothing to hide here
        // NOTE: do not call renderPlayers here; renderDraft will render both
        // the draft-specific lists and the shared player panels. Calling
        // renderPlayers here before renderDraft can cause ordering issues
        // during initialization.
      } else {
        // restore hands and controls
        document.querySelectorAll(".hand-area").forEach((el) => {
          el.style.display = "";
        });
        document.querySelectorAll(".turn-controls").forEach((el) => {
          el.style.display = "";
        });
  // top controls removed from DOM; nothing to restore here
        // restore draft-specific area visibility
        const dp = document.querySelector('.draft-players');
        if (dp) dp.style.display = '';
        draftScreen.classList.add("hidden");
        gameScreen.classList.remove("hidden");
      }
    } catch (e) {
      console.warn("setDraftModeUI failed", e);
    }
  }
  function renderHands() {
    if (typeof window !== 'undefined' && window.rpgGame && window.rpgGame.uiModule && typeof window.rpgGame.uiModule.renderHands === 'function') {
      return window.rpgGame.uiModule.renderHands();
    }
    // Render both players' hands. The active player's hand is face-up; the other player's is face-down.
    handEls.forEach((container, playerIdx) => {
      if (!container) return;
      container.innerHTML = "";
      const hand = state.players[playerIdx].hand || [];
      hand.forEach((c, idx) => {
        const ce = document.createElement("div");
        ce.className = "card small";
        ce.dataset.idx = idx;
        if (playerIdx === state.currentPlayer) {
          // face-up hand
          ce.innerHTML = `<div class="name">${c.name}</div><div class="small-meta">${c.desc || c.name}</div>`;
          if (c.desc) ce.title = c.desc;
          // determine if this card is actually playable for current actor
          try {
            let actorIdx = state.nextCharIndex;
            while (actorIdx < state.players[state.currentPlayer].chars.length && (state.players[state.currentPlayer].chars[actorIdx].isKO || state.players[state.currentPlayer].usedThisTurn.includes(actorIdx))) actorIdx++;
            const playable = isCardPlayable(c, { player: state.currentPlayer, actorIdx });
            if (playable && !state.uiLocked) {
              ce.addEventListener("click", () => selectCard(idx));
              ce.classList.add("clickable");
            }
          } catch (e) {
            // if playability check fails, conservatively allow selection
            ce.addEventListener("click", () => selectCard(idx));
            ce.classList.add("clickable");
          }
          if (state.selectedCardIdx === idx) ce.classList.add("selected");
          // transient highlight for recently stolen card (set by actionsModule)
          try {
            if (state._stealHighlight && state._stealHighlight.player === playerIdx && state._stealHighlight.idx === idx) {
              ce.classList.add('stolen');
            }
          } catch (e) {}
        } else {
          // face-down representation for opponent
          ce.classList.add("facedown");
          ce.innerHTML = `<div class="back-face">&nbsp;</div>`;
        }
        container.appendChild(ce);
      });
    });

    // ensure target-mode removed when no card selected
    if (state.selectedCardIdx === null)
      document.body.classList.remove("target-mode");
    else {
      // highlight targets for the selected card
      const card =
        state.players[state.currentPlayer].hand[state.selectedCardIdx];
      if (card) highlightTargets(card);
    }
  }

  function renderNextChar() {
    if (typeof window !== 'undefined' && window.rpgGame && window.rpgGame.uiModule && typeof window.rpgGame.uiModule.renderNextChar === 'function') {
      return window.rpgGame.uiModule.renderNextChar();
    }
    const p = state.players[state.currentPlayer];
    // find next non-KO character not acted yet this turn
    let idx = state.nextCharIndex;
    while (
      idx < p.chars.length &&
      (p.chars[idx].isKO || p.usedThisTurn.includes(idx))
    ) {
      idx++;
    }
    const nextCharElLocal = typeof document !== 'undefined' ? document.querySelector('#next-char-name') : null;
    if (idx >= p.chars.length) {
      if (nextCharElLocal) nextCharElLocal.textContent = 'None (all used)';
      state.nextCharResolved = true;
    } else {
      if (nextCharElLocal) nextCharElLocal.textContent = `${p.chars[idx].name}`;
      state.nextCharResolved = false;
    }
  }

  // Selection flow
  function selectCard(idx) {
    const player = state.players[state.currentPlayer];
    if (idx < 0 || idx >= player.hand.length) return;
    // If the card is not playable for the next available actor, do nothing
    // (no status change, no selection). This prevents Revive/Heal/etc from
    // triggering when they have no valid targets.
    const card = player.hand[idx];
    try {
      // compute next available actor index for current player
      let actorIdx = state.nextCharIndex;
      while (
        actorIdx < player.chars.length &&
        (player.chars[actorIdx].isKO || player.usedThisTurn.includes(actorIdx))
      )
        actorIdx++;
      const ctx = { player: state.currentPlayer, actorIdx };
      if (!isCardPlayable(card, ctx)) {
        // nothing to do when card isn't playable
        return;
      }
    } catch (e) {
      // if playability check fails for any reason, fall back to allowing selection
    }

    state.selectedCardIdx = idx;
    state.selectedTarget = null;
    renderHands();
    // Ensure the Play Card button for the active player is visible immediately
    try {
      document.querySelectorAll('.play-selected').forEach((b) => {
        const pIdx = Number(b.dataset.player);
        if (pIdx === state.currentPlayer && state.selectedCardIdx !== null) {
          b.classList.add('visible');
          b.disabled = false;
        } else {
          b.classList.remove('visible');
          b.disabled = true;
        }
      });
    } catch (e) {}
    // Inform the player to press Play Card to execute; do not prompt for targets
    // until the player explicitly presses Play Card.
    updateStatus("Card selected — press Play Card to play it.");
  }

  function highlightTargets(card) {
    if (typeof window !== 'undefined' && window.rpgGame && window.rpgGame.uiModule && typeof window.rpgGame.uiModule.highlightTargets === 'function') {
      return window.rpgGame.uiModule.highlightTargets(card);
    }
    // remove previous click handlers and clear any target-mode
    let hasTargets = false;
    playerCharsEl.forEach((el) => {
      Array.from(el.children).forEach((ch) => {
        ch.classList.remove("selected");
        ch.onclick = null;
      });
    });
    const current = state.players[state.currentPlayer];
    const opp = state.players[1 - state.currentPlayer];
    if (card.type === "attack" || card.type === "attackAll") {
      // target opponent characters (for attackAll we don't need selection)
      if (card.type === "attackAll")
        updateStatus(
          "Attack All will hit all opposing characters. Click End Action to confirm.",
        );
      else {
        const targetPanel = playerCharsEl[1 - state.currentPlayer];
        targetPanel.querySelectorAll(".char-card").forEach((el, i) => {
          const canTarget = !opp.chars[i].isKO;
          el.classList.toggle("selected", canTarget);
          if (canTarget) {
            el.onclick = () =>
              selectTarget({ side: 1 - state.currentPlayer, idx: i });
            el.classList.add("clickable");
            hasTargets = true;
          } else {
            el.onclick = null;
            el.classList.remove("clickable");
          }
        });
        updateStatus("Click an opposing character to target.");
      }
    } else if (
      card.type === "heal" ||
      card.type === "healAll" ||
      card.type === "revive"
    ) {
      // target own characters
      const targetPanel = playerCharsEl[state.currentPlayer];
      targetPanel.querySelectorAll(".char-card").forEach((el, i) => {
        const canTarget = !current.chars[i].isKO || card.type === "revive";
        el.classList.toggle("selected", canTarget);
        if (canTarget) {
          el.onclick = () =>
            selectTarget({ side: state.currentPlayer, idx: i });
          el.classList.add("clickable");
          hasTargets = true;
        } else {
          el.onclick = null;
          el.classList.remove("clickable");
        }
      });
      updateStatus(
        "Click a friendly character to target (or End Action to skip).",
      );
    } else {
      updateStatus("Card selected — press End Action to play it (or Pass).");
    }

    // Toggle target-mode class so hover effects and focus only appear when selecting targets
    if (hasTargets) document.body.classList.add("target-mode");
    else document.body.classList.remove("target-mode");
  }

  function selectTarget(t) {
    state.selectedTarget = t;
    updateStatus(`Target selected: ${state.players[t.side].chars[t.idx].name}`);
  }

  // Action resolution delegated to actionsModule when present (extracted to app-actions.js)
  function resolveSelectedCard() {
    if (window.rpgGame && window.rpgGame.actionsModule && typeof window.rpgGame.actionsModule.resolveSelectedCard === 'function') {
      return window.rpgGame.actionsModule.resolveSelectedCard();
    }
    // fallback: signal missing action module
    try { updateStatus('Action resolution unavailable (module missing).'); } catch (e) {}
  }

  function getCurrentActor() {
    if (window.rpgGame && window.rpgGame.turnsModule && typeof window.rpgGame.turnsModule.getCurrentActor === 'function')
      return window.rpgGame.turnsModule.getCurrentActor();
    const p = state.players[state.currentPlayer];
    // actor is nextCharIndex (the one taking action)
    let idx = state.nextCharIndex;
    while (
      idx < p.chars.length &&
      (p.chars[idx].isKO || p.usedThisTurn.includes(idx))
    )
      idx++;
    return p.chars[idx] || { name: "(no actor)", str: 0, mag: 0 };
  }

  function applyDamage(target, dmg, reason) {
    if (window.rpgGame && window.rpgGame.turnsModule && typeof window.rpgGame.turnsModule.applyDamage === 'function') {
      // pass attacker if provided as 4th arg
      const attacker = arguments.length >= 4 ? arguments[3] : undefined;
      return window.rpgGame.turnsModule.applyDamage(target, dmg, reason, attacker);
    }
    // Check for Dodge/Counter flags
    if (target.dodge) {
      log(`${reason} — ${target.name} dodged the attack! No damage.`);
      target.dodge = false;
      return;
    }
    if (target.counter && arguments.length >= 4) {
      const attacker = arguments[3];
      log(
        `${reason} — ${target.name} countered! Reflecting ${dmg} to ${attacker.name}.`,
      );
      // apply damage to attacker
      attacker.hp -= dmg;
      if (attacker.hp < 1) {
        attacker.isKO = true;
        attacker.hp = 0;
        log(`${attacker.name} is KO'd by counter!`);
        // If attacker KO'd, check for game end
        try { checkForEliminations(); } catch (e) {}
      }
      target.counter = false;
      return;
    }

    target.hp -= dmg;
    log(
      `${reason} — ${dmg} damage to ${target.name} (HP ${Math.max(0, target.hp)}/${target.maxHP})`,
    );
    if (target.hp < 1) {
      target.isKO = true;
      target.hp = 0;
      log(`${target.name} is KO'd!`);
      // Check if this KO eliminated a player (end of game)
      try { checkForEliminations(); } catch (e) {}
    }
  }

  // Check for eliminated players and declare a winner when only one remains
  function checkForEliminations() {
    try {
      if (!state || !state.players) return;
      const aliveCounts = state.players.map((p) =>
        (p.chars || []).filter((c) => !c.isKO).length,
      );
      const playersRemaining = aliveCounts.filter((n) => n > 0).length;
      if (playersRemaining <= 1) {
        state.gameOver = true;
        const winnerIdx = aliveCounts.findIndex((n) => n > 0);
        if (winnerIdx >= 0) {
          const winner = state.players[winnerIdx];
          updateStatus(`${winner.name} wins!`);
          log(`${winner.name} wins the game!`);
          // disable per-player controls
          try {
            document.querySelectorAll('.play-selected, .skip-action').forEach((el) => {
              el.disabled = true;
            });
          } catch (e) {}
        } else {
          updateStatus('Game ended in a draw.');
          log('Game ended in a draw.');
        }
      }
    } catch (e) {
      console.warn('checkForEliminations failed', e);
    }
  }

  function applyHeal(target, amt, reason) {
    if (window.rpgGame && window.rpgGame.turnsModule && typeof window.rpgGame.turnsModule.applyHeal === 'function')
      return window.rpgGame.turnsModule.applyHeal(target, amt, reason);
    if (target.isKO) {
      log(`Cannot heal ${target.name}; they are KO'd.`);
      return;
    }
    const prev = target.hp;
    target.hp = Math.min(target.maxHP, target.hp + amt);
    log(
      `${reason} — healed ${target.name} ${target.hp - prev} (HP ${target.hp}/${target.maxHP})`,
    );
  }

  function markCharUsed() {
    if (window.rpgGame && window.rpgGame.turnsModule && typeof window.rpgGame.turnsModule.markCharUsed === 'function')
      return window.rpgGame.turnsModule.markCharUsed();
    const p = state.players[state.currentPlayer];
    // find next index that wasn't used and not KO
    let idx = state.nextCharIndex;
    while (
      idx < p.chars.length &&
      (p.chars[idx].isKO || p.usedThisTurn.includes(idx))
    )
      idx++;
    if (idx < p.chars.length) {
      p.usedThisTurn.push(idx);
      state.nextCharIndex = idx + 1;
    }
    updateUI();

    // If all active characters have acted, notify in log (player may choose to end turn)
    const activeCount = p.chars.filter((c) => !c.isKO).length;
    if (p.usedThisTurn.length >= activeCount) {
      log(`${p.name} has used all active characters.`);
    }
    // Also update status panel and auto-end turn when all characters used
    if (p.usedThisTurn.length >= activeCount) {
      updateStatus(`${p.name} — all active characters used. Ending turn...`);
      saveState();
      setTimeout(() => endTurn(), 600);
    } else {
      saveState();
    }
  }

  function endTurn(drawOption) {
    if (window.rpgGame && window.rpgGame.turnsModule && typeof window.rpgGame.turnsModule.endTurn === 'function')
      return window.rpgGame.turnsModule.endTurn(drawOption);
    // drawOption ignored - drawing is automatic: if the player has 5 or more, draw 1; otherwise draw up to 5
    const p = state.players[state.currentPlayer];
    let toDraw = 0;
    if (p.hand.length >= 5) toDraw = 1;
    else toDraw = Math.max(0, 5 - p.hand.length);
    if (toDraw > 0) drawCardTo(p, toDraw);
    log(`${p.name} ends turn and draws ${toDraw} card(s).`);
    saveState();
    // switch player
    state.currentPlayer = 1 - state.currentPlayer;
    state.nextCharIndex = 0;
    state.players[state.currentPlayer].usedThisTurn = [];
    // clear defensive flags for the player whose turn is starting
    state.players[state.currentPlayer].chars.forEach((ch) => {
      ch.dodge = false;
      ch.counter = false;
    });
    state.selectedCardIdx = null;
    state.selectedTarget = null;
    updateUI();
  }

  // Button handlers
  startGameBtn.addEventListener("click", startGame);
  // per-player play/skip buttons
  playButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = Number(btn.dataset.player);
      if (p !== state.currentPlayer) return updateStatus("Not your turn");
      // If no card selected, prompt user to choose one
      if (state.selectedCardIdx === null) return updateStatus("No card selected. Choose a card to play or press Pass.");
      // If a card is selected but requires a target and none chosen, prompt targets first
      const card = state.players[state.currentPlayer].hand[state.selectedCardIdx];
      const needsTarget = ["attack", "heal", "revive", "dodge", "counter"].includes(card.type);
      if (needsTarget && state.selectedTarget === null) {
        // show target highlight UI and instruct the player
        try { highlightTargets(card); } catch (e) {}
        try { updateStatus('Select a target for the card (then press Play Card again to confirm).'); } catch (e) {}
        return;
      }
      // Otherwise resolve the selected card (no further prompting needed)
      resolveSelectedCard();
    });
  });
  skipButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = Number(btn.dataset.player);
      if (p === state.currentPlayer) {
        log(`${state.players[state.currentPlayer].name} skipped an action.`);
        markCharUsed();
      } else updateStatus("Not your turn");
    });
  });

  // Expose basic keyboard shortcuts for convenience
  window.addEventListener("keydown", (e) => {
    if (e.key === "/") {
      log("---");
    }
    if (e.key === "d") {
      // draw 1 for current player
      drawCardTo(state.players[state.currentPlayer], 1);
      updateUI();
      log("Drew 1 card (shortcut).");
    }
    // Undo / Redo keyboard shortcuts (Ctrl/Cmd+Z, Ctrl/Cmd+Y)
    if ((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (typeof undo === "function") undo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === "y") {
      e.preventDefault();
      if (typeof redo === "function") redo();
    }
  });

  // Init
  // Attempt to load saved state; if none present, start a new draft
  const restored = loadState();
  if (!restored) {
    startDraft();
    saveState();
  }

  // attach some basic click listeners to dynamically toggled elements (delegation fallback)

  // Modal helpers are provided by app-modal.js when available
  const modal = (window.rpgGame && window.rpgGame.modalModule && window.rpgGame.modalModule.modal) || $("#modal");
  const modalTitle = (window.rpgGame && window.rpgGame.modalModule && window.rpgGame.modalModule.modalTitle) || $("#modal-title");
  const modalBody = (window.rpgGame && window.rpgGame.modalModule && window.rpgGame.modalModule.modalBody) || $("#modal-body");
  const modalConfirm = (window.rpgGame && window.rpgGame.modalModule && window.rpgGame.modalModule.modalConfirm) || $("#modal-confirm");
  const modalCancel = (window.rpgGame && window.rpgGame.modalModule && window.rpgGame.modalModule.modalCancel) || $("#modal-cancel");
  // resetBtn may be used later; query lazily at use site

  // Persistence key (already declared earlier)

  function updateUndoRedoButtons() {
    if (typeof undoBtn !== "undefined" && typeof redoBtn !== "undefined") {
      undoBtn.disabled = history.length <= 1;
      redoBtn.disabled = redoStack.length === 0;
    }
  }

  function pushHistory(snap) {
    try {
      const json = JSON.stringify(snap);
      if (
        history.length &&
        JSON.stringify(history[history.length - 1]) === json
      )
        return;
      history.push(JSON.parse(json));
      if (history.length > HISTORY_LIMIT) history.shift();
      // any new action clears redo stack
      redoStack = [];
      // persist both history and cleared redo
      persistHistory();
      updateUndoRedoButtons();
    } catch (e) {
      console.warn("pushHistory failed", e);
    }
  }

  function persistHistory() {
    try {
      // persist only the last PERSIST_HISTORY_LIMIT entries for both history and redo
      const toPersist = history.slice(-PERSIST_HISTORY_LIMIT);
      const redoPersist = redoStack.slice(-PERSIST_HISTORY_LIMIT);
      const payload = { history: toPersist, redo: redoPersist };
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(payload));
    } catch (e) {
      console.debug("persistHistory failed:", e && e.message ? e.message : e);
    }
  }

  function loadPersistedHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (!raw) return false;
      const obj = JSON.parse(raw);
      if (!obj || !Array.isArray(obj.history)) return false;
      history = obj.history.slice();
      if (history.length > HISTORY_LIMIT)
        history = history.slice(-HISTORY_LIMIT);
      // load redo if present
      redoStack = Array.isArray(obj.redo) ? obj.redo.slice() : [];
      if (redoStack.length > HISTORY_LIMIT)
        redoStack = redoStack.slice(-HISTORY_LIMIT);
      updateUndoRedoButtons();
      return true;
    } catch (e) {
      console.debug("loadPersistedHistory failed:", e && e.message ? e.message : e);
      return false;
    }
  }

  function applySnapshot(snap, opts = { recordHistory: false }) {
    if (stateModule && typeof stateModule.applySnapshot === 'function') {
      stateModule.applySnapshot(snap, opts);
      // UI updates should be performed by caller after applying snapshot
      return;
    }
    // apply a snapshot (same shape as getSnapshot)
    state.players = snap.players.map((p) => ({
      id: p.id,
      name: p.name,
      chars: p.chars.map((c) => ({
        name: c.name,
        hp: c.hp,
        maxHP: c.maxHP,
        str: c.str,
        mag: c.mag,
        isKO: !!c.isKO,
        dodge: !!c.dodge,
        counter: !!c.counter,
      })),
      hand: p.hand.slice(),
      usedThisTurn: p.usedThisTurn.slice(),
    }));
    state.deck = snap.deck.slice();
    state.discard = snap.discard.slice();
    state.draftPool = snap.draftPool.slice();
    state.draftTurn = snap.draftTurn;
    state.draftPicksPerPlayer = snap.draftPicksPerPlayer;
    state.currentPlayer = snap.currentPlayer;
    state.nextCharIndex = snap.nextCharIndex;
    // restore UI-related fields if present
    state.selectedCardIdx = typeof snap.selectedCardIdx !== 'undefined' ? snap.selectedCardIdx : null;
    state.selectedTarget = typeof snap.selectedTarget !== 'undefined' ? snap.selectedTarget : null;
    state.isDraft = typeof snap.isDraft !== 'undefined' ? !!snap.isDraft : null;
    state.statusText = snap.statusText || '';
    // update UI and storage. Prefer explicit isDraft flag in snapshot when available
    let useDraftMode = null;
    if (typeof snap.isDraft !== 'undefined') useDraftMode = !!snap.isDraft;
    else {
      const totalPicked = state.players[0].chars.length + state.players[1].chars.length;
      useDraftMode = totalPicked < state.draftPicksPerPlayer * 2;
    }
    if (useDraftMode) {
      setDraftModeUI(true);
      renderDraft();
    } else {
      setDraftModeUI(false);
      updateUI();
    }
    if (opts.recordHistory) pushHistory(getSnapshot());
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    } catch (e) {}
    updateUndoRedoButtons();
  }

  function getSnapshot() {
    if (stateModule && typeof stateModule.getSnapshot === 'function')
      return stateModule.getSnapshot();
    // Create a serializable snapshot of the game state
    return {
      players: state.players.map((p) => ({
        id: p.id,
        name: p.name,
        chars: p.chars.map((c) => ({
          name: c.name,
          hp: c.hp,
          maxHP: c.maxHP,
          str: c.str,
          mag: c.mag,
          isKO: !!c.isKO,
          dodge: !!c.dodge,
          counter: !!c.counter,
        })),
        hand: p.hand.slice(),
        usedThisTurn: p.usedThisTurn.slice(),
      })),
      deck: state.deck.slice(),
      discard: state.discard.slice(),
      draftPool: state.draftPool.slice(),
      draftTurn: state.draftTurn,
      draftPicksPerPlayer: state.draftPicksPerPlayer,
      currentPlayer: state.currentPlayer,
      nextCharIndex: state.nextCharIndex,
      selectedCardIdx: state.selectedCardIdx,
      selectedTarget: state.selectedTarget,
      isDraft: !!state.isDraft,
      statusText: state.statusText || '',
    };
  }

  // Save the current state to localStorage and optionally record it in the undo history
  function saveState(recordHistory = true) {
    if (stateModule && typeof stateModule.saveState === 'function') {
      return stateModule.saveState(recordHistory);
    }
    try {
      const snap = getSnapshot();
      if (recordHistory) pushHistory(snap);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
      // small log for debug to ensure saves occur
      try {
        const picks =
          (snap.players[0].chars.length || 0) +
          (snap.players[1].chars.length || 0);
        log(`Saved snapshot — picks ${picks}`);
      } catch (e) {}
      updateUndoRedoButtons();
    } catch (e) {
      console.debug("Save failed:", e && e.message ? e.message : e);
    }
  }

  function clearSavedState() {
    if (stateModule && typeof stateModule.clearSavedState === 'function') {
      return stateModule.clearSavedState();
    }
    localStorage.removeItem(STORAGE_KEY);
  }

  function loadState() {
    if (stateModule && typeof stateModule.loadState === 'function') {
      const ok = stateModule.loadState();
      if (!ok) return false;
      // ensure UI reflects loaded state
      const totalPicked = state.players[0].chars.length + state.players[1].chars.length;
      if (totalPicked >= state.draftPicksPerPlayer * 2) {
        setDraftModeUI(false);
        updateUI();
      } else {
        setDraftModeUI(true);
        renderDraft();
      }
      return true;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const snap = JSON.parse(raw);
      try {
        const picks =
          (snap.players[0].chars.length || 0) +
          (snap.players[1].chars.length || 0);
        log(`Loaded snapshot from storage — picks ${picks}`);
      } catch (e) {}
      // apply snapshot to runtime state
      state.players = snap.players.map((p) => ({
        id: p.id,
        name: p.name,
        chars: p.chars.map((c) => ({
          name: c.name,
          hp: c.hp,
          maxHP: c.maxHP,
          str: c.str,
          mag: c.mag,
          isKO: !!c.isKO,
          dodge: !!c.dodge,
          counter: !!c.counter,
        })),
        hand: p.hand.slice(),
        usedThisTurn: p.usedThisTurn.slice(),
      }));
      state.deck = snap.deck.slice();
      state.discard = snap.discard.slice();
      state.draftPool = snap.draftPool.slice();
      state.draftTurn = snap.draftTurn;
      state.draftPicksPerPlayer = snap.draftPicksPerPlayer;
      state.currentPlayer = snap.currentPlayer;
      state.nextCharIndex = snap.nextCharIndex;
      // if we loaded a mid-draft situation, show draft screen; otherwise show game screen
      const totalPicked =
        state.players[0].chars.length + state.players[1].chars.length;
      if (totalPicked >= state.draftPicksPerPlayer * 2) {
        setDraftModeUI(false);
      } else {
        setDraftModeUI(true);
      }
      updateUI();
      // try to load persisted history (up to PERSIST_HISTORY_LIMIT). If none, seed with current snapshot
      const loaded = loadPersistedHistory();
      if (!loaded) {
        history = [getSnapshot()];
        redoStack = [];
        persistHistory();
      }
      // If the main saved snapshot represents a started game but we have a more recent persisted
      // snapshot in history that is still in-draft, prefer restoring that draft snapshot so picks persist
      // (this helps cases where auto-start saved the game immediately after the final pick).
      try {
        if (history && history.length) {
          const lastPersisted = history[history.length - 1];
          const picksInSaved =
            (snap.players[0].chars.length || 0) +
            (snap.players[1].chars.length || 0);
          const picksInLast =
            (lastPersisted.players[0].chars.length || 0) +
            (lastPersisted.players[1].chars.length || 0);
          if (
            picksInSaved >= snap.draftPicksPerPlayer * 2 &&
            picksInLast < snap.draftPicksPerPlayer * 2
          ) {
            // Apply the draft snapshot instead of the auto-started game snapshot
            applySnapshot(lastPersisted, { recordHistory: false });
            log(
              "Restored draft-in-progress from persisted history (prefer draft over auto-start).",
            );
            return true;
          }
        }
      } catch (e) {
        console.warn("history selection failed", e);
      }
      updateUndoRedoButtons();
      log("Loaded saved game.");
      return true;
    } catch (e) {
      console.warn("Load failed", e);
      return false;
    }
  }

  // wire reset button (query at use time to avoid missing element if modalModule handled it)
  try {
    const rb = (window.rpgGame && window.rpgGame.modalModule && window.rpgGame.modalModule.resetBtn) || $("#reset-btn");
    if (rb) rb.addEventListener("click", () => {
      if (!confirm("Reset saved game and reload?")) return;
      clearSavedState();
      location.reload();
    });
  } catch (e) {}

  // Undo / Redo actions
  function undo() {
    if (stateModule && typeof stateModule.undo === 'function') {
      const ok = stateModule.undo();
      if (!ok) updateStatus('Nothing to undo.');
      else {
        log('Undo performed.');
        try { updateUI(); } catch (e) {}
      }
      return;
    }
    updateStatus('Undo not available in this build.');
  }

  function redo() {
    if (stateModule && typeof stateModule.redo === 'function') {
      const ok = stateModule.redo();
      if (!ok) updateStatus('Nothing to redo.');
      else {
        log('Redo performed.');
        try { updateUI(); } catch (e) {}
      }
      return;
    }
    updateStatus('Redo not available in this build.');
  }

  if (typeof undoBtn !== "undefined" && undoBtn)
    undoBtn.addEventListener("click", undo);
  if (typeof redoBtn !== "undefined" && redoBtn)
    redoBtn.addEventListener("click", redo);

  // Absorb modal flow delegated to actionsModule when present
  function openAbsorbModal(card, player, cardIdx) {
    if (window.rpgGame && window.rpgGame.actionsModule && typeof window.rpgGame.actionsModule.openAbsorbModal === 'function') {
      return window.rpgGame.actionsModule.openAbsorbModal(card, player, cardIdx);
    }
    try { updateStatus('Absorb flow unavailable (module missing).'); } catch (e) {}
  }
  // Expose light test hooks when running in a browser-like environment. Tests
  // running under jsdom will use these to drive UI actions deterministically.
  try {
    if (typeof window !== "undefined") {
      window.rpgGame = window.rpgGame || {};
      // expose a small app API so extracted modules can call back into core helpers
      window.rpgGame.app = {
        getCurrentActor: getCurrentActor,
        markCharUsed: markCharUsed,
        drawCardTo: drawCardTo,
        log: log,
        updateStatus: updateStatus,
        updateUI: updateUI,
        shuffle: shuffle,
        isCardPlayable: isCardPlayable,
        saveState: saveState,
        endTurn: endTurn,
        pickChar: pickChar,
        selectCard: selectCard,
        selectTarget: selectTarget,
      };
      window.rpgGame.testHooks = {
        getState: () => JSON.parse(JSON.stringify(state)),
        renderDraft: () => renderDraft(),
        pickChar: (idx) => pickChar(idx),
        startDraft: () => startDraft(),
        startGame: () => startGame(),
        renderPlayers: () => renderPlayers(),
        // persistence & history helpers
        saveState: (recordHistory = true) => saveState(recordHistory),
        loadState: () => loadState(),
        getSnapshot: () => getSnapshot(),
        // undo/redo
        undo: () => undo(),
        redo: () => redo(),
      };
    }
  } catch (e) {
    /* ignore */
  }
})();
