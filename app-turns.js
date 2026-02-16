(function(){
  // Turn-and-actor helpers module
  function getState(){
    if (window.rpgGame && window.rpgGame.stateModule) return window.rpgGame.stateModule.state;
    return window.rpgGame && window.rpgGame.state ? window.rpgGame.state : null;
  }

  function getCurrentActor(){
    const state = getState();
    if (!state) return { name: '(no actor)', str:0, mag:0 };
    const p = state.players[state.currentPlayer];
    let idx = state.nextCharIndex;
    while (idx < p.chars.length && (p.chars[idx].isKO || p.usedThisTurn.includes(idx))) idx++;
    return p.chars[idx] || { name: '(no actor)', str:0, mag:0 };
  }

  function applyDamage(target, dmg, reason, attacker){
    // mirrors original semantics from app.js
    if (!target) return;
    if (target.dodge) {
      try { if (window.rpgGame && window.rpgGame.app && window.rpgGame.app.log) window.rpgGame.app.log(`${reason} — ${target.name} dodged the attack! No damage.`); } catch(e){}
      target.dodge = false;
      return;
    }
    if (target.counter && typeof attacker !== 'undefined') {
      try { if (window.rpgGame && window.rpgGame.app && window.rpgGame.app.log) window.rpgGame.app.log(`${reason} — ${target.name} countered! Reflecting ${dmg} to ${attacker.name}.`); } catch(e){}
      attacker.hp -= dmg;
      if (attacker.hp < 1) { attacker.isKO = true; attacker.hp = 0; try { if (window.rpgGame && window.rpgGame.app && window.rpgGame.app.log) window.rpgGame.app.log(`${attacker.name} is KO'd by counter!`); } catch(e){} }
      target.counter = false;
      return;
    }
    target.hp -= dmg;
    try { if (window.rpgGame && window.rpgGame.app && window.rpgGame.app.log) window.rpgGame.app.log(`${reason} — ${dmg} damage to ${target.name} (HP ${Math.max(0, target.hp)}/${target.maxHP})`); } catch(e){}
    if (target.hp < 1) { target.isKO = true; target.hp = 0; try { if (window.rpgGame && window.rpgGame.app && window.rpgGame.app.log) window.rpgGame.app.log(`${target.name} is KO'd!`); } catch(e){} }
  }

  function applyHeal(target, amt, reason){
    if (!target) return;
    if (target.isKO) { try { if (window.rpgGame && window.rpgGame.app && window.rpgGame.app.log) window.rpgGame.app.log(`Cannot heal ${target.name}; they are KO'd.`); } catch(e){}; return; }
    const prev = target.hp;
    target.hp = Math.min(target.maxHP, target.hp + amt);
    try { if (window.rpgGame && window.rpgGame.app && window.rpgGame.app.log) window.rpgGame.app.log(`${reason} — healed ${target.name} ${target.hp - prev} (HP ${target.hp}/${target.maxHP})`); } catch(e){}
  }

  function markCharUsed(){
    const state = getState();
    if (!state) return;
    const p = state.players[state.currentPlayer];
    let idx = state.nextCharIndex;
    while (idx < p.chars.length && (p.chars[idx].isKO || p.usedThisTurn.includes(idx))) idx++;
    if (idx < p.chars.length) {
      p.usedThisTurn.push(idx);
      state.nextCharIndex = idx + 1;
    }
    try { if (window.rpgGame && window.rpgGame.app && window.rpgGame.app.updateUI) window.rpgGame.app.updateUI(); } catch(e){}

    const activeCount = p.chars.filter((c)=>!c.isKO).length;
    if (p.usedThisTurn.length >= activeCount) {
      try { if (window.rpgGame && window.rpgGame.app && window.rpgGame.app.log) window.rpgGame.app.log(`${p.name} has used all active characters.`); } catch(e){}
    }
    if (p.usedThisTurn.length >= activeCount) {
      try { if (window.rpgGame && window.rpgGame.app && window.rpgGame.app.updateStatus) window.rpgGame.app.updateStatus(`${p.name} — all active characters used. Ending turn...`); } catch(e){}
      try { if (window.rpgGame && window.rpgGame.app && window.rpgGame.app.saveState) window.rpgGame.app.saveState(); } catch(e){}
      // call module-local endTurn to avoid depending on app export
      setTimeout(()=>{ try { endTurn(); } catch(e){} }, 600);
    } else {
      try { if (window.rpgGame && window.rpgGame.app && window.rpgGame.app.saveState) window.rpgGame.app.saveState(); } catch(e){}
    }
  }

  function endTurn(drawOption){
    const state = getState();
    if (!state) return;
    const p = state.players[state.currentPlayer];
    let toDraw = 0;
    if (p.hand.length >= 5) toDraw = 1;
    else toDraw = Math.max(0, 5 - p.hand.length);
    if (toDraw > 0) {
      for (let i=0;i<toDraw;i++){
        if (state.deck.length === 0){ state.deck = state.discard.splice(0); // shuffle locally
          shuffle(state.deck);
        }
        const c = state.deck.shift(); if (c) p.hand.push(c);
      }
    }
    try { if (window.rpgGame && window.rpgGame.app && window.rpgGame.app.log) window.rpgGame.app.log(`${p.name} ends turn and draws ${toDraw} card(s).`); } catch(e){}
    try { if (window.rpgGame && window.rpgGame.app && window.rpgGame.app.saveState) window.rpgGame.app.saveState(); } catch(e){}
    state.currentPlayer = 1 - state.currentPlayer;
    state.nextCharIndex = 0;
    state.players[state.currentPlayer].usedThisTurn = [];
    state.players[state.currentPlayer].chars.forEach((ch)=>{ ch.dodge = false; ch.counter = false; });
    state.selectedCardIdx = null; state.selectedTarget = null;
    try { if (window.rpgGame && window.rpgGame.app && window.rpgGame.app.updateUI) window.rpgGame.app.updateUI(); } catch(e){}
  }

  try{ if (typeof window !== 'undefined'){ window.rpgGame = window.rpgGame || {}; window.rpgGame.turnsModule = { getCurrentActor, applyDamage, applyHeal, markCharUsed, endTurn }; } } catch(e){}
})();

// local Fisher-Yates shuffle helper
function shuffle(arr){
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
