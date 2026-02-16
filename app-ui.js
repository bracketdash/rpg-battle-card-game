(function(){
  // UI module for the RPG Battle Card Game. Uses state from window.rpgGame.stateModule.state when available.
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function getState() {
    if (window.rpgGame && window.rpgGame.stateModule) return window.rpgGame.stateModule.state;
    return window.rpgGame && window.rpgGame.state ? window.rpgGame.state : null;
  }

  function renderDraft() {
    const state = getState();
  const availableCharacters = $("#available-characters");
  const statusEl = $('#status');
    const playerCharsEl = [$("#player-1-chars"), $("#player-2-chars")];
    const startGameBtn = $("#start-game-btn");

    let picksLeft = 0;
    try {
      if (!state.draftPool || !state.draftPool.length) {
        state.draftPool = window.CHAR_TEMPLATES ? window.CHAR_TEMPLATES.map((c)=>Object.assign({},c)) : [];
        state.draftTurn = 0;
      }
      try { availableCharacters.style.display = 'flex'; availableCharacters.style.flexWrap = 'wrap'; } catch(e){}
      availableCharacters.innerHTML = '';
      const picksLeftRaw = state.draftPicksPerPlayer - state.players[state.draftTurn].chars.length;
      picksLeft = Math.max(0, picksLeftRaw);
      state.draftPool.forEach((c, idx) => {
        const el = document.createElement('div');
        el.className = 'char-card';
        if (picksLeft > 0 && !state.uiLocked) {
          el.classList.add('clickable');
          el.addEventListener('click', () => window.rpgGame.appPickChar ? window.rpgGame.appPickChar(idx) : window.rpgGame.app && window.rpgGame.app.pickChar && window.rpgGame.app.pickChar(idx));
        }
        const hp = c.maxHP || c.hp || 0;
        const hpPercent = Math.max(0, Math.round(((c.hp||0)/(hp||1))*100));
        el.innerHTML = `<div class="name">${c.name}</div><div class="hp"><div class="hp-text">HP: ${c.hp}/${hp}</div><div class="hp-bar"><div class="hp-fill" style="width:${hpPercent}%;"></div></div></div><div class="small-meta">STR ${c.str} • MAG ${c.mag}</div>`;
        availableCharacters.appendChild(el);
      });
      try { document.querySelectorAll('.player-panel').forEach((pp)=>{pp.style.display='';}); } catch(e){}
    } catch (err) {
      console.error('renderDraft failed', err);
      try {
        state.draftPool = window.CHAR_TEMPLATES ? window.CHAR_TEMPLATES.map((c)=>Object.assign({},c)) : [];
        availableCharacters.innerHTML = '';
        state.draftPool.forEach((c, idx) => {
          const el = document.createElement('div');
          el.className = 'char-card';
          if (!state.uiLocked) {
            el.classList.add('clickable');
            el.addEventListener('click', () => window.rpgGame.appPickChar ? window.rpgGame.appPickChar(idx) : window.rpgGame.app.pickChar(idx));
          }
          el.innerHTML = `<div class="name">${c.name}</div><div class="small-meta">HP ${c.hp} • STR ${c.str} • MAG ${c.mag}</div>`;
          availableCharacters.appendChild(el);
        });
      } catch (e) { console.error('renderDraft fallback failed', e); }
    }

  if (statusEl) statusEl.textContent = `${state.players[state.draftTurn].name}, pick a character (${picksLeft} picks left)`;
    const drafted1 = $("#drafted-1");
    const drafted2 = $("#drafted-2");
    if (drafted1) drafted1.innerHTML='';
    if (drafted2) drafted2.innerHTML='';
  state.players[0].chars.forEach((c)=>{ if (drafted1) { const el=document.createElement('div'); el.className='char-card'; const hpPercent = Math.max(0, Math.round(((c.hp||0)/(c.maxHP||1))*100)); el.innerHTML=`<div class="name">${c.name}</div><div class="hp"><div class="hp-text">HP: ${c.hp}/${c.maxHP}</div><div class="hp-bar"><div class="hp-fill" style="width:${hpPercent}%;"></div></div></div><div class="small-meta">STR ${c.str} • MAG ${c.mag}</div>`; drafted1.appendChild(el);} });
  state.players[1].chars.forEach((c)=>{ if (drafted2) { const el=document.createElement('div'); el.className='char-card'; const hpPercent = Math.max(0, Math.round(((c.hp||0)/(c.maxHP||1))*100)); el.innerHTML=`<div class="name">${c.name}</div><div class="hp"><div class="hp-text">HP: ${c.hp}/${c.maxHP}</div><div class="hp-bar"><div class="hp-fill" style="width:${hpPercent}%;"></div></div></div><div class="small-meta">STR ${c.str} • MAG ${c.mag}</div>`; drafted2.appendChild(el);} });

    try {
      if (playerCharsEl[0]) {
        playerCharsEl[0].innerHTML = '';
        if (state.players[0].chars.length === 0) {
          const ph = document.createElement('div');
          ph.className = 'draft-placeholder';
          ph.textContent = 'Draft your first character below.';
          playerCharsEl[0].appendChild(ph);
        } else {
          state.players[0].chars.forEach((c) => {
            const el = document.createElement('div');
            el.className = 'char-card';
            const hpPercent = Math.max(0, Math.round(((c.hp || 0) / (c.maxHP || 1)) * 100));
            el.innerHTML = `<div class="name">${c.name}</div><div class="hp"><div class="hp-text">HP: ${c.hp}/${c.maxHP}</div><div class="hp-bar"><div class="hp-fill" style="width:${hpPercent}%;"></div></div></div><div class="small-meta">STR ${c.str} • MAG ${c.mag}</div>`;
            playerCharsEl[0].appendChild(el);
          });
        }
      }
      if (playerCharsEl[1]) {
        playerCharsEl[1].innerHTML = '';
        if (state.players[1].chars.length === 0) {
          const ph = document.createElement('div');
          ph.className = 'draft-placeholder';
          ph.textContent = 'Draft your first character below.';
          playerCharsEl[1].appendChild(ph);
        } else {
          state.players[1].chars.forEach((c) => {
            const el = document.createElement('div');
            el.className = 'char-card';
            const hpPercent = Math.max(0, Math.round(((c.hp || 0) / (c.maxHP || 1)) * 100));
            el.innerHTML = `<div class="name">${c.name}</div><div class="hp"><div class="hp-text">HP: ${c.hp}/${c.maxHP}</div><div class="hp-bar"><div class="hp-fill" style="width:${hpPercent}%;"></div></div></div><div class="small-meta">STR ${c.str} • MAG ${c.mag}</div>`;
            playerCharsEl[1].appendChild(el);
          });
        }
      }
    } catch (e) {}

    const totalPicked = state.players[0].chars.length + state.players[1].chars.length;
    if (totalPicked === state.draftPicksPerPlayer * 2) { if (startGameBtn) { startGameBtn.disabled=false; startGameBtn.style.display=''; } } else { if (startGameBtn) { startGameBtn.disabled=true; startGameBtn.style.display='none'; } }
    // Ensure the active player panel is visually highlighted during drafting
    try { setActivePlayerVisual(state.draftTurn); } catch (e) { /* best-effort */ }
  }

  function renderPlayers() {
    const state = getState();
    const playerCharsEl = [$("#player-1-chars"), $("#player-2-chars")];
    for (let i=0;i<2;i++){
      const p = state.players[i];
      const el = playerCharsEl[i];
      if (!el) continue;
      el.innerHTML = '';
      p.chars.forEach((c, idx)=>{
        const classes = ['char-card'];
        if (c.isKO) classes.push('ko');
        if (state.players[i].usedThisTurn && state.players[i].usedThisTurn.includes(idx)) classes.push('used');
        if (i === state.currentPlayer) {
          let nextIdx = state.nextCharIndex;
          while (nextIdx < p.chars.length && (p.chars[nextIdx].isKO || p.usedThisTurn.includes(nextIdx))) nextIdx++;
          if (nextIdx === idx) classes.push('current-actor');
        }
        const ce = document.createElement('div'); ce.className = classes.join(' ');
        const usedBadge = state.players[i].usedThisTurn && state.players[i].usedThisTurn.includes(idx) ? '<span class="flag-badge">USED</span>' : '';
        const hpPercent = Math.max(0, Math.round(((c.hp||0)/(c.maxHP||1))*100));
        ce.innerHTML = `<div class="name">${c.name}${c.isKO?'<span class="ko-badge">KO</span>':''}${usedBadge}</div><div class="hp"><div class="hp-text">HP: ${c.hp}/${c.maxHP}</div><div class="hp-bar"><div class="hp-fill" style="width:${hpPercent}%;"></div></div></div><div class="small-meta">STR ${c.str} • MAG ${c.mag}${c.dodge?'<span class="flag-badge">DODGE</span>':''}${c.counter?'<span class="flag-badge">COUNTER</span>':''}</div>`;
        el.appendChild(ce);
      });
    }
  }

  

  function renderHands() {
    const state = getState();
    const handEls = [$("#hand-1"), $("#hand-2")];
    // If playability functions aren't available yet, we may need to re-render
    // shortly after app/gameCore initialize. Use a local pending flag to avoid
    // flooding renders.
    if (typeof window !== 'undefined' && !renderHands._pendingRerender && !(window.rpgGame && window.rpgGame.app && typeof window.rpgGame.app.isCardPlayable === 'function') && !(window.gameCore && typeof window.gameCore.isCardPlayable === 'function')) {
      renderHands._pendingRerender = true;
      setTimeout(() => { renderHands._pendingRerender = false; try { renderHands(); } catch (e) {} }, 120);
    }
    handEls.forEach((container, playerIdx)=>{
      if (!container) return;
      container.innerHTML='';
      const hand = state.players[playerIdx].hand || [];
      hand.forEach((c, idx)=>{
        const ce = document.createElement('div'); ce.className='card small'; ce.dataset.idx = idx;
          if (playerIdx === state.currentPlayer) {
            ce.innerHTML = `<div class="name">${c.name}</div><div class="small-meta">${c.desc||c.name}</div>`;
            if (c.desc) ce.title = c.desc;
            // determine if this card is actually playable for current actor
            try {
              const actorIdx = (function(){ let ai = state.nextCharIndex; while(ai < state.players[state.currentPlayer].chars.length && (state.players[state.currentPlayer].chars[ai].isKO || state.players[state.currentPlayer].usedThisTurn.includes(ai))) ai++; return ai; })();
              // Prefer the canonical app-level playability check if exposed, otherwise fallback to gameCore hook
              const playable = (window.rpgGame && window.rpgGame.app && typeof window.rpgGame.app.isCardPlayable === 'function')
                ? window.rpgGame.app.isCardPlayable(c, { player: state.currentPlayer, actorIdx })
                : (window.gameCore && typeof window.gameCore.isCardPlayable === 'function') ? window.gameCore.isCardPlayable(c, { player: state.currentPlayer, actorIdx }) : false;
              // conservative default: if we cannot determine playability yet, assume NOT playable
              if (playable && !state.uiLocked) {
                ce.addEventListener('click', ()=> { if (window.rpgGame && window.rpgGame.appSelectCard) window.rpgGame.appSelectCard(idx); else if(window.rpgGame && window.rpgGame.app && window.rpgGame.app.selectCard) window.rpgGame.app.selectCard(idx); });
                ce.classList.add('clickable');
                ce.title = c.desc || '';
              } else {
                ce.classList.remove('clickable');
                ce.title = 'This card cannot be played by the current actor';
              }
            } catch(e){
              // if the playability check fails, conservatively do not make the card clickable
              ce.classList.remove('clickable');
              ce.title = 'This card cannot be played by the current actor';
            }
            if (state.selectedCardIdx === idx) ce.classList.add('selected');
            // transient highlight for recently stolen card (set by actionsModule)
            try {
              if (state._stealHighlight && state._stealHighlight.player === playerIdx && state._stealHighlight.idx === idx) {
                ce.classList.add('stolen');
                try { console.debug('renderHands: applying stolen highlight', state._stealHighlight); } catch (e) {}
              }
            } catch (e) {}
          } else { ce.classList.add('facedown'); ce.innerHTML = `<div class="back-face">&nbsp;</div>`; }
        container.appendChild(ce);
      });
    });
    if (state.selectedCardIdx === null) document.body.classList.remove('target-mode');
    else {
      const card = state.players[state.currentPlayer].hand[state.selectedCardIdx];
      if (card && window.rpgGame && window.rpgGame.uiModule && window.rpgGame.uiModule.highlightTargets) window.rpgGame.uiModule.highlightTargets(card);
    }

    // Show the Play Selected button only for the active player and when a card is selected
    try {
      const playButtons = Array.from(document.querySelectorAll('.play-selected'));
      playButtons.forEach((b) => {
        const pi = Number(b.dataset.player);
        if (pi === state.currentPlayer && state.selectedCardIdx !== null) {
          b.style.display = '';
          b.disabled = false;
        } else {
          b.style.display = 'none';
          b.disabled = true;
        }
      });
    } catch (e) { /* ignore */ }
  }

  function renderNextChar() {
    const state = getState();
    const nextCharEl = $("#next-char-name");
    const p = state.players[state.currentPlayer];
    let idx = state.nextCharIndex;
    while (idx < p.chars.length && (p.chars[idx].isKO || p.usedThisTurn.includes(idx))) idx++;
    if (idx >= p.chars.length) { if (nextCharEl) nextCharEl.textContent = 'None (all used)'; state.nextCharResolved = true; }
    else { if (nextCharEl) nextCharEl.textContent = `${p.chars[idx].name}`; state.nextCharResolved = false; }
  }

  function highlightTargets(card) {
    const state = getState();
    const playerCharsEl = [$("#player-1-chars"), $("#player-2-chars")];
    let hasTargets = false;
    playerCharsEl.forEach((el)=>{ Array.from(el.children).forEach((ch)=>{ ch.classList.remove('selected'); ch.onclick = null; }); });
    const current = state.players[state.currentPlayer];
    const opp = state.players[1 - state.currentPlayer];
      if (card.type === 'attack' || card.type === 'attackAll') {
      if (card.type === 'attackAll') {
        const statusEl = $('#status'); if (statusEl) statusEl.textContent = 'Attack All will hit all opposing characters. Click Play Card to confirm.';
      } else {
        const targetPanel = playerCharsEl[1 - state.currentPlayer];
        targetPanel.querySelectorAll('.char-card').forEach((el, i)=>{
          const canTarget = !opp.chars[i].isKO;
          el.classList.toggle('selected', canTarget);
          if (canTarget) {
            el.onclick = ()=>{ if (window.rpgGame && window.rpgGame.appSelectTarget) window.rpgGame.appSelectTarget({side:1-state.currentPlayer, idx:i}); else if(window.rpgGame && window.rpgGame.app && window.rpgGame.app.selectTarget) window.rpgGame.app.selectTarget({side:1-state.currentPlayer, idx:i}); };
            el.classList.add('clickable');
            el.title = '';
            hasTargets = true;
          } else {
            el.onclick = null;
            el.classList.remove('clickable');
            el.title = 'Cannot target this character right now';
          }
        });
        const statusEl = $('#status'); if (statusEl) statusEl.textContent = 'Click an opposing character to target.';
      }
    } else if (card.type === 'heal' || card.type === 'healAll' || card.type === 'revive') {
      const targetPanel = playerCharsEl[state.currentPlayer];
      targetPanel.querySelectorAll('.char-card').forEach((el, i)=>{
        const canTarget = !current.chars[i].isKO || card.type === 'revive';
        el.classList.toggle('selected', canTarget);
        if (canTarget) {
          el.onclick = ()=>{ if (window.rpgGame && window.rpgGame.appSelectTarget) window.rpgGame.appSelectTarget({side:state.currentPlayer, idx:i}); else if(window.rpgGame && window.rpgGame.app && window.rpgGame.app.selectTarget) window.rpgGame.app.selectTarget({side:state.currentPlayer, idx:i}); };
          el.classList.add('clickable');
          el.title = '';
          hasTargets = true;
        } else {
          el.onclick = null;
          el.classList.remove('clickable');
          el.title = 'Cannot target this character right now';
        }
      });
      const statusEl = $('#status'); if (statusEl) statusEl.textContent = 'Click a friendly character to target (then press Play Card to confirm).';
    } else {
      const statusEl = $('#status'); if (statusEl) statusEl.textContent = 'Card selected — press Play Card to play it (or Pass).';
    }
    if (hasTargets) document.body.classList.add('target-mode'); else document.body.classList.remove('target-mode');
  }

  function setDraftModeUI(isDraft) {
    try {
      // persist mode to state so undo/redo can restore UI mode
      try { const state = getState(); if (state) state.isDraft = !!isDraft; } catch (e) {}
      const draftScreen = $('#draft-screen');
      const gameScreen = $('#game-screen');
      if (isDraft) {
        if (draftScreen) draftScreen.classList.remove('hidden');
        if (gameScreen) gameScreen.classList.remove('hidden');
        document.querySelectorAll('.hand-area').forEach((el)=>{ el.style.display='none'; });
        document.querySelectorAll('.turn-controls').forEach((el)=>{ el.style.display='none'; });
        const dp = document.querySelector('.draft-players'); if (dp) dp.style.display='none';
  // top controls removed from DOM; nothing to hide here
      } else {
        document.querySelectorAll('.hand-area').forEach((el)=>{ el.style.display=''; });
        document.querySelectorAll('.turn-controls').forEach((el)=>{ el.style.display=''; });
  // top controls removed from DOM; nothing to restore here
        const dp = document.querySelector('.draft-players'); if (dp) dp.style.display='';
        if (draftScreen) draftScreen.classList.add('hidden');
        if (gameScreen) gameScreen.classList.remove('hidden');
      }
    } catch (e) { console.warn('setDraftModeUI failed', e); }
  }

  function setActivePlayerVisual(idx) {
    const playerPanels = [$('#player-1-panel'), $('#player-2-panel')];
    // clear any previous active/draft-active/pulse classes
    playerPanels.forEach((el,i)=>{ if(el){ el.classList.remove('active'); el.classList.remove('pulse'); el.classList.remove('draft-active'); }});
    const el = playerPanels[idx]; if (!el) return;
    // detect whether we're in draft mode (draft-screen visible)
    let isDraft = false;
    try { const ds = document.getElementById('draft-screen'); isDraft = ds && !ds.classList.contains('hidden'); } catch(e){}
    // Use the same `.active` class for both draft and gameplay so the
    // visual treatment is consistent. Always add `.active` and the
    // `.pulse` animation here.
    el.classList.add('active');
    void el.offsetWidth; // reflow to trigger animation
    el.classList.add('pulse');

    // Update panel headings to indicate whose turn it is when active.
    try {
      const state = getState();
      playerPanels.forEach((pp, i) => {
        if (!pp) return;
        const h = pp.querySelector('h3');
        if (!h) return;
        try {
          if (state && state.players && state.players[i] && i === idx) h.textContent = `${state.players[i].name}'s turn`;
          else if (state && state.players && state.players[i]) h.textContent = state.players[i].name;
          else h.textContent = i === idx ? `Player ${i+1}'s turn` : `Player ${i+1}`;
        } catch (e) { /* ignore */ }
      });
    } catch (e) { /* ignore */ }
  }

  function evaluateSkipVisibility() {
    const state = getState();
    const skipButtons = Array.from(document.querySelectorAll('.skip-action'));
    const p = state.players[state.currentPlayer];
    let idx = state.nextCharIndex;
    while (idx < p.chars.length && (p.chars[idx].isKO || p.usedThisTurn.includes(idx))) idx++;
    const actor = p.chars[idx];
    if (!actor) { skipButtons.forEach((b)=>b.style.display='none'); return; }
    const playable = p.hand.some((card)=> {
      try { return window.gameCore ? (typeof window.gameCore.isCardPlayable === 'function' ? window.gameCore.isCardPlayable(card, {player:state.currentPlayer, actorIdx:idx}) : true) : true; } catch(e){ return true; }
    });
    skipButtons.forEach((b)=>{ const pi = Number(b.dataset.player); if (pi === state.currentPlayer) b.style.display = playable ? 'none' : ''; else b.style.display='none'; });
    try { if (!playable) {
      const statusEl = document.querySelector('#status'); if (statusEl) statusEl.textContent = `${state.players[state.currentPlayer].name}: No actions available. Press Pass button.`;
    } } catch(e) {}
  }

  // export
  window.rpgGame = window.rpgGame || {};
  window.rpgGame.uiModule = {
    renderDraft,
    renderPlayers,
    renderHands,
    renderNextChar,
    highlightTargets,
    setDraftModeUI,
    setActivePlayerVisual,
    evaluateSkipVisibility,
  };
})();
