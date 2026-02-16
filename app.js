// Simple client-only implementation of the RPG Battle Card Game (2 players)
// Designed for single-device play. No server.

(function () {
  // Character templates (from README)
  const CHAR_TEMPLATES = [
    { name: "Vex", hp: 13, str: 4, mag: 4 },
    { name: "Kalen", hp: 17, str: 3, mag: 3 },
    { name: "Anya", hp: 23, str: 2, mag: 2 },
    { name: "Sera", hp: 30, str: 1, mag: 1 },
    { name: "Gideon", hp: 17, str: 4, mag: 2 },
    { name: "Mystra", hp: 17, str: 2, mag: 4 },
    { name: "Sybil", hp: 23, str: 1, mag: 3 },
    { name: "Thorne", hp: 23, str: 3, mag: 1 },
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
  const draftInfo = $("#draft-info");
  const undoBtn = $("#undo-btn");
  const redoBtn = $("#redo-btn");
  const startGameBtn = $("#start-game-btn");
  const gameScreen = $("#game-screen");
  const playerPanels = [$("#player-1-panel"), $("#player-2-panel")];
  const playerCharsEl = [$("#player-1-chars"), $("#player-2-chars")];
  const handEls = [$("#hand-1"), $("#hand-2")];
  const logEl = $("#log");
  const currentTurnEl = $("#current-turn");
  const nextCharEl = $("#next-char-name");
  const playButtons = Array.from(document.querySelectorAll(".play-selected"));
  const skipButtons = Array.from(document.querySelectorAll(".skip-action"));
  const statusEl = $("#status");

  // Persistence keys and history (declared early so init can call loadState/saveState)
  const STORAGE_KEY = "rpg_battle_state_v1";
  const STORAGE_KEY_HISTORY = STORAGE_KEY + "_history_v1";
  const PERSIST_HISTORY_LIMIT = 5; // how many snapshots to keep in localStorage
  // Undo / Redo history (in-memory)
  const HISTORY_LIMIT = 200;
  let history = [];
  let redoStack = [];

  // Game state
  const state = {
    players: [createEmptyPlayer(1), createEmptyPlayer(2)],
    draftPool: [],
    draftTurn: 0, // 0 or 1, who picks next in draft
    draftPicksPerPlayer: 3,
    deck: [],
    discard: [],
    currentPlayer: 0,
    // per-turn: index of next character to act for the current player
    nextCharIndex: 0,
    selectedCardIdx: null,
    selectedTarget: null,
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
    const el = document.createElement("div");
    el.textContent = `[${new Date().toLocaleTimeString().slice(3)}] ${msg}`;
    logEl.prepend(el);
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
    renderDraft();
    updateStatus("Drafting: Player 1 picks first; pick 3 each");
  }

  function renderDraft() {
    availableCharacters.innerHTML = "";
    // how many picks this player has left
    const picksLeftRaw =
      state.draftPicksPerPlayer - state.players[state.draftTurn].chars.length;
    const picksLeft = Math.max(0, picksLeftRaw);
    state.draftPool.forEach((c, idx) => {
      const el = document.createElement("div");
      el.className = "char-card";
      // only mark clickable if current drafter still has picks left
      if (picksLeft > 0) {
        el.classList.add("clickable");
        el.addEventListener("click", () => pickChar(idx));
      }
      el.innerHTML = `<div class="name">${c.name}</div>
      <div class="small-meta">HP ${c.hp} • STR ${c.str} • MAG ${c.mag}</div>`;
      availableCharacters.appendChild(el);
    });
    draftInfo.textContent = `${state.players[state.draftTurn].name}, pick a character (${picksLeft} picks left)`;
    // render drafted lists
    const drafted1 = $("#drafted-1");
    const drafted2 = $("#drafted-2");
    drafted1.innerHTML = "";
    drafted2.innerHTML = "";
    state.players[0].chars.forEach((c) => {
      const el = document.createElement("div");
      el.className = "char-card";
      el.innerHTML = `<div class="name">${c.name}</div><div class="small-meta">HP ${c.maxHP}</div>`;
      drafted1.appendChild(el);
    });
    state.players[1].chars.forEach((c) => {
      const el = document.createElement("div");
      el.className = "char-card";
      el.innerHTML = `<div class="name">${c.name}</div><div class="small-meta">HP ${c.maxHP}</div>`;
      drafted2.appendChild(el);
    });
    // Also populate the main player character containers so their positions don't jump when switching to game view
    try {
      if (playerCharsEl[0]) {
        playerCharsEl[0].innerHTML = "";
        state.players[0].chars.forEach((c) => {
          const el = document.createElement("div");
          el.className = "char-card";
          el.innerHTML = `<div class="name">${c.name}</div><div class="small-meta">HP ${c.maxHP}</div>`;
          playerCharsEl[0].appendChild(el);
        });
      }
      if (playerCharsEl[1]) {
        playerCharsEl[1].innerHTML = "";
        state.players[1].chars.forEach((c) => {
          const el = document.createElement("div");
          el.className = "char-card";
          el.innerHTML = `<div class="name">${c.name}</div><div class="small-meta">HP ${c.maxHP}</div>`;
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
    const char = state.draftPool.splice(idx, 1)[0];
    // clone
    const charInstance = Object.assign({}, char, {
      maxHP: char.hp,
      hp: char.hp,
      isKO: false,
    });
    state.players[state.draftTurn].chars.push(charInstance);
    // alternate
    const pickedBy = state.draftTurn;
    state.draftTurn = 1 - state.draftTurn;
    log(`${state.players[pickedBy].name} drafted ${charInstance.name}`);
    // If drafting is complete, auto-start and set starting player to the last drafter
    const totalPicked =
      state.players[0].chars.length + state.players[1].chars.length;
    if (totalPicked >= state.draftPicksPerPlayer * 2) {
      // last drafter is 'pickedBy'
      // startGame will now set the starting player to that last drafter
      saveState();
      startGame();
      return;
    }
    saveState();
    renderDraft();
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
    draftScreen.classList.add("hidden");
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
  }

  // UI rendering
  function updateUI() {
    currentTurnEl.textContent = `Current: ${state.players[state.currentPlayer].name}`;
  renderPlayers();
  renderHands();
    renderNextChar();
    evaluateSkipVisibility();
    // show deck/discard in status
    updateStatus(
      `${state.players[state.currentPlayer].name}'s turn — Deck: ${state.deck.length} Discard: ${state.discard.length}`,
    );
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
      const p = Number(b.dataset.player);
      if (p === state.currentPlayer) b.style.display = playable ? "none" : "";
      else b.style.display = "none";
    });
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
  function renderHands() {
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
          ce.addEventListener("click", () => selectCard(idx));
          if (state.selectedCardIdx === idx) ce.classList.add("selected");
        } else {
          // face-down representation for opponent
          ce.classList.add("facedown");
          ce.innerHTML = `<div class="back-face">&nbsp;</div>`;
        }
        container.appendChild(ce);
      });
    });

    // ensure target-mode removed when no card selected
    if (state.selectedCardIdx === null) document.body.classList.remove("target-mode");
    else {
      // highlight targets for the selected card
      const card = state.players[state.currentPlayer].hand[state.selectedCardIdx];
      if (card) highlightTargets(card);
    }
  }

  function renderNextChar() {
    const p = state.players[state.currentPlayer];
    // find next non-KO character not acted yet this turn
    let idx = state.nextCharIndex;
    while (
      idx < p.chars.length &&
      (p.chars[idx].isKO || p.usedThisTurn.includes(idx))
    ) {
      idx++;
    }
    if (idx >= p.chars.length) {
      nextCharEl.textContent = "None (all used)";
      state.nextCharResolved = true;
    } else {
      nextCharEl.textContent = `${p.chars[idx].name}`;
      state.nextCharResolved = false;
    }
  }

  // Selection flow
  function selectCard(idx) {
    const player = state.players[state.currentPlayer];
    if (idx < 0 || idx >= player.hand.length) return;
  state.selectedCardIdx = idx;
  state.selectedTarget = null;
  renderHands();
    updateStatus(
      "Select a target if necessary, or press End Action to skip using the card.",
    );
    // highlight possible targets depending on card type
    const card = player.hand[idx];
    highlightTargets(card);
  }

  function highlightTargets(card) {
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
          el.classList.toggle("selected", !opp.chars[i].isKO);
          if (!opp.chars[i].isKO)
            el.onclick = () => selectTarget({ side: 1 - state.currentPlayer, idx: i });
          if (!opp.chars[i].isKO) hasTargets = true;
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
        el.classList.toggle(
          "selected",
          !current.chars[i].isKO || card.type === "revive",
        );
        el.onclick = () => selectTarget({ side: state.currentPlayer, idx: i });
        if (!current.chars[i].isKO || card.type === "revive") hasTargets = true;
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

  // Action resolution
  function resolveSelectedCard() {
    const p = state.players[state.currentPlayer];
    const cardIdx = state.selectedCardIdx;
    if (cardIdx === null) {
      updateStatus(
        "No card selected. Choose a card to play or press Skip Action to pass.",
      );
      return;
    }
    // ensure there is an available actor
    const actor = getCurrentActor();
    if (!actor || actor.name === "(no actor)") {
      updateStatus(
        "No available actor to perform actions; end your turn or pass.",
      );
      return;
    }
    const card = p.hand[cardIdx];
    // apply effects
    switch (card.type) {
      case "absorb":
        // open modal to let player pick donors and amounts
        openAbsorbModal(card, p, cardIdx);
        return; // modal will continue flow and discard card when confirming
      case "dodge":
        if (!state.selectedTarget) {
          updateStatus("Select a friendly character to place Dodge on.");
          return;
        }
        const dTarget =
          state.players[state.selectedTarget.side].chars[
            state.selectedTarget.idx
          ];
        dTarget.dodge = true;
        log(
          `${p.name} placed DODGE on ${dTarget.name}. It will cancel the next incoming attack.`,
        );
        break;
      case "counter":
        if (!state.selectedTarget) {
          updateStatus("Select a friendly character to place Counter on.");
          return;
        }
        const cTarget =
          state.players[state.selectedTarget.side].chars[
            state.selectedTarget.idx
          ];
        cTarget.counter = true;
        log(
          `${p.name} placed COUNTER on ${cTarget.name}. It will reflect the next incoming attack back.`,
        );
        break;
      case "attack":
        if (!state.selectedTarget) {
          updateStatus("Select a target to attack.");
          return;
        }
        const target =
          state.players[state.selectedTarget.side].chars[
            state.selectedTarget.idx
          ];
        const attacker = getCurrentActor();
        // use pure core function and apply results
        const res = window.gameCore.attack(attacker, target, card.mult || 1);
        // apply target changes
        target.hp = res.target.hp;
        target.isKO = !!res.target.isKO;
        if (res.result === "dodged")
          log(
            `${attacker.name} uses ${card.name} — ${target.name} dodged the attack!`,
          );
        else if (res.result === "countered") {
          // apply attacker changes
          attacker.hp = res.attacker.hp;
          attacker.isKO = !!res.attacker.isKO;
          log(
            `${attacker.name} uses ${card.name} — ${target.name} countered! ${attacker.name} takes ${attacker.maxHP - attacker.hp} damage.`,
          );
        } else {
          const dmg = (attacker.str || 0) * (card.mult || 1);
          log(
            `${attacker.name} uses ${card.name} — ${dmg} damage to ${target.name} (HP ${Math.max(0, target.hp)}/${target.maxHP})`,
          );
        }
        break;
      case "attackAll":
        const opp = state.players[1 - state.currentPlayer];
        const actor = getCurrentActor();
        const results = window.gameCore.attackAll(
          actor,
          opp.chars,
          card.mult || 1,
        );
        results.forEach((r, i) => {
          const ch = opp.chars[i];
          ch.hp = r.target.hp;
          ch.isKO = !!r.target.isKO;
          if (r.result === "dodged")
            log(`${actor.name} uses ${card.name} — ${ch.name} dodged.`);
          else if (r.result === "countered") {
            actor.hp = r.attacker.hp;
            actor.isKO = !!r.attacker.isKO;
            log(`${ch.name} countered — ${actor.name} took damage.`);
          } else
            log(
              `${actor.name} uses ${card.name} — ${actor.str * (card.mult || 1)} to ${ch.name} (HP ${ch.hp}/${ch.maxHP})`,
            );
        });
        break;
      case "heal":
        if (!state.selectedTarget) {
          updateStatus("Select a friendly target to heal.");
          return;
        }
        const targetH =
          state.players[state.selectedTarget.side].chars[
            state.selectedTarget.idx
          ];
        const healer = getCurrentActor();
        const healAmt = healer.mag * (card.mult || 1);
        const resH = window.gameCore.applyHeal(targetH, healAmt);
        targetH.hp = resH.target.hp;
        targetH.isKO = !!resH.target.isKO;
        log(
          `${healer.name} uses ${card.name} — healed ${targetH.name} ${resH.healed || 0} (HP ${targetH.hp}/${targetH.maxHP})`,
        );
        break;
      case "healAll":
        const team = state.players[state.currentPlayer];
        const healerA = getCurrentActor();
        const healResults = window.gameCore.healAll(
          healerA,
          team.chars,
          card.mult || 1,
        );
        healResults.forEach((r, i) => {
          if (!team.chars[i].isKO) {
            team.chars[i].hp = r.target.hp;
            log(
              `${healerA.name} heals ${team.chars[i].name} for ${r.healed} (HP ${team.chars[i].hp}/${team.chars[i].maxHP})`,
            );
          }
        });
        break;
      case "revive":
        if (!state.selectedTarget) {
          updateStatus("Select a friendly target to revive.");
          return;
        }
        const revT =
          state.players[state.selectedTarget.side].chars[
            state.selectedTarget.idx
          ];
        if (!revT.isKO) {
          updateStatus("That character is already active.");
          return;
        }
        const reviver = getCurrentActor();
        const revived = window.gameCore.revive(
          revT,
          reviver.mag * (card.mult || 1),
        );
        revT.isKO = false;
        revT.hp = revived.target.hp;
        log(`${reviver.name} revived ${revT.name} to ${revT.hp} HP.`);
        break;
      case "draw":
        const num = card.mult || 1;
        drawCardTo(p, num);
        log(`${p.name} drew ${num} card(s).`);
        break;
      case "discard":
        const oppP = state.players[1 - state.currentPlayer];
        let cnt = card.mult || 1;
        // use core discard (deterministic from end)
        const dres = window.gameCore.discardFromHand(oppP.hand, cnt);
        oppP.hand = dres.hand;
        state.discard.push(...dres.removed);
        log(
          `${p.name} forced ${oppP.name} to discard ${dres.removed.length} card(s).`,
        );
        break;
      case "steal":
        const opp2 = state.players[1 - state.currentPlayer];
        if (opp2.hand.length > 0) {
          const sres = window.gameCore.stealCard(opp2.hand, p.hand);
          opp2.hand = sres.from;
          p.hand = sres.to;
          log(`${p.name} stole a card from ${opp2.name}.`);
        } else log("Steal failed - opponent had no cards.");
        break;
      default:
        log(`Played ${card.name} (unhandled) by ${p.name}`);
    }

    // move played card to discard
    const played = p.hand.splice(cardIdx, 1)[0];
    state.discard.push(played);
    state.selectedCardIdx = null;
    state.selectedTarget = null;
    markCharUsed();
    updateUI();
    saveState();
  }

  function getCurrentActor() {
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
    }
  }

  function applyHeal(target, amt, reason) {
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
      if (p === state.currentPlayer) resolveSelectedCard();
      else updateStatus("Not your turn");
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

  // Modal helpers for Absorb
  const modal = $("#modal");
  const modalTitle = $("#modal-title");
  const modalBody = $("#modal-body");
  const modalConfirm = $("#modal-confirm");
  const modalCancel = $("#modal-cancel");
  const resetBtn = $("#reset-btn");

  // Modal listener management to avoid leaked listeners when modal closed by other means
  let modalListeners = [];
  function addModalListener(el, evt, fn) {
    el.addEventListener(evt, fn);
    modalListeners.push({ el, evt, fn });
  }
  function clearModalListeners() {
    modalListeners.forEach((l) => {
      try {
        l.el.removeEventListener(l.evt, l.fn);
      } catch (e) {}
    });
    modalListeners = [];
  }
  function closeModal() {
    modal.classList.add("hidden");
    try {
      modalBody.innerHTML = "";
    } catch (e) {} // defer removal so any currently-dispatched handlers still run
    setTimeout(() => clearModalListeners(), 0);
  }

  // allow clicking outside modal-inner to close, and Esc to close
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // Ensure modal is hidden on init and wire default confirm/cancel to close
  try {
    modal.classList.add("hidden");
  } catch (e) {}
  addModalListener(modalConfirm, "click", closeModal);
  addModalListener(modalCancel, "click", closeModal);

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
      console.warn("persistHistory failed", e);
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
      console.warn("loadPersistedHistory failed", e);
      return false;
    }
  }

  function applySnapshot(snap, opts = { recordHistory: false }) {
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
    // update UI and storage
    // decide whether we're in draft mode or game mode based on picks
    const totalPicked =
      state.players[0].chars.length + state.players[1].chars.length;
    if (totalPicked >= state.draftPicksPerPlayer * 2) {
      // game mode
      draftScreen.classList.add("hidden");
      gameScreen.classList.remove("hidden");
      updateUI();
    } else {
      // draft mode
      draftScreen.classList.remove("hidden");
      gameScreen.classList.add("hidden");
      renderDraft();
    }
    if (opts.recordHistory) pushHistory(getSnapshot());
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    } catch (e) {}
    updateUndoRedoButtons();
  }

  function getSnapshot() {
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
    };
  }

  // Save the current state to localStorage and optionally record it in the undo history
  function saveState(recordHistory = true) {
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
      console.warn("Save failed", e);
    }
  }

  function clearSavedState() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function loadState() {
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
        draftScreen.classList.add("hidden");
        gameScreen.classList.remove("hidden");
      } else {
        draftScreen.classList.remove("hidden");
        gameScreen.classList.add("hidden");
      }
      updateUI();
      renderDraft();
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

  resetBtn.addEventListener("click", () => {
    if (!confirm("Reset saved game and reload?")) return;
    clearSavedState();
    location.reload();
  });

  // Undo / Redo actions
  function undo() {
    if (history.length <= 1) {
      updateStatus("Nothing to undo.");
      return;
    }
    const current = history.pop();
    redoStack.push(current);
    const prev = history[history.length - 1];
    applySnapshot(prev, { recordHistory: false });
    // persist trimmed history & redo after undo
    persistHistory();
    log("Undo performed.");
  }

  function redo() {
    if (redoStack.length === 0) {
      updateStatus("Nothing to redo.");
      return;
    }
    const next = redoStack.pop();
    history.push(next);
    applySnapshot(next, { recordHistory: false });
    // persist trimmed history & redo after redo
    persistHistory();
    log("Redo performed.");
  }

  if (typeof undoBtn !== "undefined" && undoBtn)
    undoBtn.addEventListener("click", undo);
  if (typeof redoBtn !== "undefined" && redoBtn)
    redoBtn.addEventListener("click", redo);

  function openAbsorbModal(card, player, cardIdx) {
    // actor is current actor
    const actorIdx = (() => {
      let i = state.nextCharIndex;
      while (
        i < player.chars.length &&
        (player.chars[i].isKO || player.usedThisTurn.includes(i))
      )
        i++;
      return i;
    })();
    const actor = player.chars[actorIdx];
    if (!actor) {
      updateStatus("No available actor to perform Absorb.");
      return;
    }
    const cap = actor.mag * (card.mult || 1);
    // donors: any non-KO character (not the actor) with damage > 0
    const donors = [];
    state.players.forEach((pl, side) => {
      pl.chars.forEach((ch, idx) => {
        if (side === state.currentPlayer && idx === actorIdx) return; // skip actor
        const damage = ch.maxHP - ch.hp;
        if (!ch.isKO && damage > 0)
          donors.push({ side, idx, char: ch, damage });
      });
    });
    if (donors.length === 0) {
      updateStatus("No valid donors with damage to absorb from.");
      return;
    }

    modalTitle.textContent = `Absorb — ${actor.name} can absorb up to ${cap} damage`;
    modalBody.innerHTML = "";
    const info = document.createElement("div");
    info.className = "small-meta";
    info.textContent =
      "Enter amounts to move from each donor (total must be ≤ cap).";
    modalBody.appendChild(info);
    donors.forEach((d) => {
      const row = document.createElement("div");
      row.className = "donor-row";
      const name = document.createElement("div");
      name.className = "donor-name";
      name.textContent = `${state.players[d.side].name} — ${d.char.name} (damage ${d.damage})`;
      const input = document.createElement("input");
      input.type = "number";
      input.min = 0;
      input.max = d.damage;
      input.value = 0;
      input.dataset.side = d.side;
      input.dataset.idx = d.idx;
      row.appendChild(name);
      row.appendChild(input);
      modalBody.appendChild(row);
    });
    // live total
    const totalEl = document.createElement("div");
    totalEl.className = "small-meta";
    totalEl.style.marginTop = "8px";
    totalEl.textContent = "Total: 0";
    modalBody.appendChild(totalEl);

    function updateTotal() {
      const inputs = Array.from(modalBody.querySelectorAll("input"));
      const total = inputs.reduce(
        (s, i) => s + Math.max(0, Number(i.value) || 0),
        0,
      );
      totalEl.textContent = `Total: ${total} (cap ${cap})`;
      if (total > cap) totalEl.style.color = "var(--lose)";
      else totalEl.style.color = "var(--muted)";
    }
    modalBody
      .querySelectorAll("input")
      .forEach((i) => i.addEventListener("input", updateTotal));

    modal.classList.remove("hidden");

    function confirm() {
      const inputs = Array.from(modalBody.querySelectorAll("input"));
      const requests = inputs
        .map((i) => ({
          side: Number(i.dataset.side),
          idx: Number(i.dataset.idx),
          amt: Math.max(0, Number(i.value) || 0),
        }))
        .filter((r) => r.amt > 0);
      const total = requests.reduce((s, r) => s + r.amt, 0);
      if (total > cap) {
        alert("Total exceeds absorb cap. Reduce amounts.");
        return;
      }
      // validate donors still have that much damage
      for (const r of requests) {
        const ch = state.players[r.side].chars[r.idx];
        const avail = ch.maxHP - ch.hp;
        if (r.amt > avail) {
          alert("A donor no longer has that much damage available.");
          return;
        }
      }
      // use core absorb to compute new actor and donors
      const donorsList = [];
      state.players.forEach((pl, side) =>
        pl.chars.forEach((ch) =>
          donorsList.push({ hp: ch.hp, maxHP: ch.maxHP, isKO: !!ch.isKO }),
        ),
      );
      // donorsList order corresponds to a flattened list; we need to map requests to flattened indices
      const flatRequests = requests.map((r) => {
        // compute flat index
        let flatIndex = 0;
        for (let s = 0; s < r.side; s++)
          flatIndex += state.players[s].chars.length;
        flatIndex += r.idx;
        return { donorIndex: flatIndex, amt: r.amt, side: r.side, idx: r.idx };
      });
      // call core with actor and donors subset — produce donors array matching flattened structure
      // actor representation
      const actorFlatIndex = (() => {
        let i = 0;
        let count = 0;
        while (i < state.players.length) {
          if (i === state.currentPlayer) {
            // actor is at player.current's chars[actorIdx]
            break;
          }
          i++;
        }
        return 0;
      })();
      // For simplicity, call core with actor and donors array built per players but we must map back accordingly
      // Build donors array ordered per player and char index
      const flatDonors = [];
      state.players.forEach((pl) =>
        pl.chars.forEach((ch) =>
          flatDonors.push({ hp: ch.hp, maxHP: ch.maxHP, isKO: !!ch.isKO }),
        ),
      );
      const actorIdxLocal = (() => {
        let i = state.nextCharIndex;
        const p = player;
        while (
          i < p.chars.length &&
          (p.chars[i].isKO || p.usedThisTurn.includes(i))
        )
          i++;
        return i;
      })();
      const actorForCore = { hp: actor.hp, maxHP: actor.maxHP };
      const coreRequests = flatRequests.map((fr) => ({
        donorIndex: fr.donorIndex,
        amt: fr.amt,
      }));
      let coreRes;
      try {
        coreRes = window.gameCore.absorbTransfer(
          actorForCore,
          flatDonors,
          coreRequests,
          cap,
        );
      } catch (e) {
        alert("Absorb failed: " + e.message);
        return;
      }
      // apply donors and actor back into state
      // coreRes.donors is flat array matching flatDonors
      let flatPos = 0;
      state.players.forEach((pl, side) => {
        pl.chars.forEach((ch, idx) => {
          const d = coreRes.donors[flatPos++];
          ch.hp = d.hp;
          ch.isKO = !!d.isKO;
        });
      });
      // actor is in player's chars at actorIdx
      actor.hp = coreRes.actor.hp;
      actor.isKO = !!coreRes.actor.isKO;
      log(`${actor.name} absorbed ${coreRes.total} (self-damage).`);
      // discard card
      const played = player.hand.splice(cardIdx, 1)[0];
      state.discard.push(played);
      closeModal();
      updateUI();
      markCharUsed();
    }
    function cancel() {
      closeModal();
    }

    addModalListener(modalConfirm, "click", confirm);
    addModalListener(modalCancel, "click", cancel);
  }
})();
