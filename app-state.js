(function(){
  // State + persistence module for the RPG Battle Card Game
  const STORAGE_KEY = "rpg_battle_state_v1";
  const STORAGE_KEY_HISTORY = STORAGE_KEY + "_history_v1";
  const PERSIST_HISTORY_LIMIT = 5;
  const HISTORY_LIMIT = 200;

  let history = [];
  let redoStack = [];

  // initial state shape (will be mutated by applySnapshot/loadState)
  const state = {
    players: [ { id:1, name:'Player 1', chars:[], hand:[], usedThisTurn:[] }, { id:2, name:'Player 2', chars:[], hand:[], usedThisTurn:[] } ],
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
  };

  function updateUndoRedoButtons() {
    // UI layer will call this via test hooks or check history directly; keep noop here in case
    try {
      const undoBtn = document.getElementById('undo-btn');
      const redoBtn = document.getElementById('redo-btn');
      if (undoBtn) undoBtn.disabled = history.length <= 1;
      if (redoBtn) redoBtn.disabled = redoStack.length === 0;
    } catch (e) {}
  }

  function pushHistory(snap) {
    try {
      const json = JSON.stringify(snap);
      if (history.length && JSON.stringify(history[history.length - 1]) === json) return;
      history.push(JSON.parse(json));
      if (history.length > HISTORY_LIMIT) history.shift();
      redoStack = [];
      persistHistory();
      updateUndoRedoButtons();
    } catch (e) {
      console.debug('pushHistory failed', e && e.message ? e.message : e);
    }
  }

  function persistHistory() {
    try {
      const toPersist = history.slice(-PERSIST_HISTORY_LIMIT);
      const redoPersist = redoStack.slice(-PERSIST_HISTORY_LIMIT);
      const payload = { history: toPersist, redo: redoPersist };
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(payload));
    } catch (e) {
      console.debug('persistHistory failed', e && e.message ? e.message : e);
    }
  }

  function loadPersistedHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (!raw) return false;
      const obj = JSON.parse(raw);
      if (!obj || !Array.isArray(obj.history)) return false;
      history = obj.history.slice();
      if (history.length > HISTORY_LIMIT) history = history.slice(-HISTORY_LIMIT);
      redoStack = Array.isArray(obj.redo) ? obj.redo.slice() : [];
      if (redoStack.length > HISTORY_LIMIT) redoStack = redoStack.slice(-HISTORY_LIMIT);
      updateUndoRedoButtons();
      return true;
    } catch (e) {
      console.debug('loadPersistedHistory failed', e && e.message ? e.message : e);
      return false;
    }
  }

  function getSnapshot() {
    return {
      players: state.players.map((p) => ({
        id: p.id,
        name: p.name,
        chars: p.chars.map((c) => ({
          name: c.name, hp: c.hp, maxHP: c.maxHP, str: c.str, mag: c.mag, isKO: !!c.isKO, dodge: !!c.dodge, counter: !!c.counter
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

  function applySnapshot(snap, opts = { recordHistory: false }) {
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
    state.selectedCardIdx = typeof snap.selectedCardIdx !== 'undefined' ? snap.selectedCardIdx : null;
    state.selectedTarget = typeof snap.selectedTarget !== 'undefined' ? snap.selectedTarget : null;
    state.isDraft = !!snap.isDraft;
    state.statusText = snap.statusText || '';
    if (opts.recordHistory) pushHistory(getSnapshot());
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snap)); } catch (e) {}
    updateUndoRedoButtons();
  }

  function saveState(recordHistory = true) {
    try {
      const snap = getSnapshot();
      if (recordHistory) pushHistory(snap);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    } catch (e) {
      console.debug('Save failed:', e && e.message ? e.message : e);
    }
    updateUndoRedoButtons();
  }

  function clearSavedState() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const snap = JSON.parse(raw);
      // apply snapshot but don't touch UI here
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
      const loaded = loadPersistedHistory();
      if (!loaded) { history = [getSnapshot()]; redoStack = []; persistHistory(); }
      // prefer draft snapshot from persisted history if appropriate
      try {
        if (history && history.length) {
          const lastPersisted = history[history.length - 1];
          const picksInSaved = (snap.players[0].chars.length || 0) + (snap.players[1].chars.length || 0);
          const picksInLast = (lastPersisted.players[0].chars.length || 0) + (lastPersisted.players[1].chars.length || 0);
          if (picksInSaved >= snap.draftPicksPerPlayer * 2 && picksInLast < snap.draftPicksPerPlayer * 2) {
            // prefer draft snapshot
            applySnapshot(lastPersisted, { recordHistory: false });
            return true;
          }
        }
      } catch (e) { console.debug('history selection failed', e && e.message ? e.message : e); }
      updateUndoRedoButtons();
      return true;
    } catch (e) {
      console.debug('Load failed', e && e.message ? e.message : e);
      return false;
    }
  }

  function undo() {
    if (history.length <= 1) return false;
    const current = history.pop();
    redoStack.push(current);
    const prev = history[history.length - 1];
    applySnapshot(prev, { recordHistory: false });
    persistHistory();
    return true;
  }

  function redo() {
    if (redoStack.length === 0) return false;
    const next = redoStack.pop();
    history.push(next);
    applySnapshot(next, { recordHistory: false });
    persistHistory();
    return true;
  }

  // export to window and CommonJS
  try {
    if (typeof window !== 'undefined') {
      window.rpgGame = window.rpgGame || {};
      window.rpgGame.stateModule = {
        state,
        getSnapshot,
        applySnapshot,
        saveState,
        loadState,
        clearSavedState,
        pushHistory,
        loadPersistedHistory,
        undo,
        redo,
      };
    }
  } catch (e) {}

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      state,
      getSnapshot,
      applySnapshot,
      saveState,
      loadState,
      clearSavedState,
      pushHistory,
      loadPersistedHistory,
      undo,
      redo,
    };
  }
})();
