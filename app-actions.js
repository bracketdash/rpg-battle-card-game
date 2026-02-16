(function(){
  // Action resolution module: resolveSelectedCard and multi-step flows (Absorb)
  function getState(){
    if (window.rpgGame && window.rpgGame.stateModule) return window.rpgGame.stateModule.state;
    return window.rpgGame && window.rpgGame.state ? window.rpgGame.state : null;
  }

  function safe(fn){ try { return fn(); } catch(e){ console.warn('actionsModule error', e); } }

  function getCurrentActor() {
    const state = getState();
    if (!state) return { name: '(no actor)', str:0, mag:0 };
    const p = state.players[state.currentPlayer];
    let idx = state.nextCharIndex;
    while (
      idx < p.chars.length &&
      (p.chars[idx].isKO || p.usedThisTurn.includes(idx))
    ) idx++;
    return p.chars[idx] || { name: '(no actor)', str:0, mag:0 };
  }

  function resolveSelectedCard(){
    const state = getState();
    if (!state) return;
    const app = window.rpgGame && window.rpgGame.app;
    const ui = window.rpgGame && window.rpgGame.uiModule;
    const p = state.players[state.currentPlayer];
    const cardIdx = state.selectedCardIdx;
    if (cardIdx === null) { safe(()=>app && app.updateStatus && app.updateStatus('No card selected. Choose a card to play or press Skip Action to pass.')); return; }
    const actor = getCurrentActor();
    if (!actor || actor.name === '(no actor)') { safe(()=>app && app.updateStatus && app.updateStatus('No available actor to perform actions; end your turn or pass.')); return; }
    const card = p.hand[cardIdx];
    switch(card.type){
      case 'absorb':
        // hand off to modal flow
        safe(()=>openAbsorbModal(card, p, cardIdx));
        return; // modal will continue flow
      case 'dodge':
        if (!state.selectedTarget){ safe(()=>app && app.updateStatus && app.updateStatus('Select a friendly character to place Dodge on.')); return; }
        {
          const dTarget = state.players[state.selectedTarget.side].chars[state.selectedTarget.idx];
          dTarget.dodge = true;
          safe(()=>app && app.log && app.log(`${p.name} placed DODGE on ${dTarget.name}. It will cancel the next incoming attack.`));
        }
        break;
      case 'counter':
        if (!state.selectedTarget){ safe(()=>app && app.updateStatus && app.updateStatus('Select a friendly character to place Counter on.')); return; }
        {
          const cTarget = state.players[state.selectedTarget.side].chars[state.selectedTarget.idx];
          cTarget.counter = true;
          safe(()=>app && app.log && app.log(`${p.name} placed COUNTER on ${cTarget.name}. It will reflect the next incoming attack back.`));
        }
        break;
      case 'attack':
        if (!state.selectedTarget){ safe(()=>app && app.updateStatus && app.updateStatus('Select a target to attack.')); return; }
        {
          const target = state.players[state.selectedTarget.side].chars[state.selectedTarget.idx];
          const attacker = getCurrentActor();
          const res = window.gameCore.attack(attacker, target, card.mult || 1);
          target.hp = res.target.hp; target.isKO = !!res.target.isKO;
          // propagate status flags changed by core (dodge/counter cleared)
          // ensure flags are updated (coerce to booleans when missing)
          target.dodge = !!res.target.dodge;
          target.counter = !!res.target.counter;
          if (res.result === 'dodged') safe(()=>app && app.log && app.log(`${attacker.name} uses ${card.name} — ${target.name} dodged the attack!`));
          else if (res.result === 'countered'){
            attacker.hp = res.attacker.hp; attacker.isKO = !!res.attacker.isKO;
            safe(()=>app && app.log && app.log(`${attacker.name} uses ${card.name} — ${target.name} countered! ${attacker.name} takes ${attacker.maxHP - attacker.hp} damage.`));
          } else {
            const dmg = (attacker.str || 0) * (card.mult || 1);
            safe(()=>app && app.log && app.log(`${attacker.name} uses ${card.name} — ${dmg} damage to ${target.name} (HP ${Math.max(0, target.hp)}/${target.maxHP})`));
          }
        }
        break;
      case 'attackAll':
        {
          const opp = state.players[1 - state.currentPlayer];
          const actor = getCurrentActor();
          const results = window.gameCore.attackAll(actor, opp.chars, card.mult || 1);
          results.forEach((r,i)=>{
            const ch = opp.chars[i];
            ch.hp = r.target.hp; ch.isKO = !!r.target.isKO;
            // propagate flags (dodge/counter) from core back to UI state
            // ensure flags are updated (coerce to booleans when missing)
            const prevD = ch.dodge, prevC = ch.counter;
            ch.dodge = !!r.target.dodge;
            ch.counter = !!r.target.counter;
            // (no-op) flags updated above; keep UI state consistent
            if (r.result === 'dodged') safe(()=>app && app.log && app.log(`${actor.name} uses ${card.name} — ${ch.name} dodged.`));
            else if (r.result === 'countered'){ actor.hp = r.attacker.hp; actor.isKO = !!r.attacker.isKO; safe(()=>app && app.log && app.log(`${ch.name} countered — ${actor.name} took damage.`)); }
            else safe(()=>app && app.log && app.log(`${actor.name} uses ${card.name} — ${actor.str * (card.mult || 1)} to ${ch.name} (HP ${ch.hp}/${ch.maxHP})`));
          });
        }
        break;
      case 'heal':
        if (!state.selectedTarget){ safe(()=>app && app.updateStatus && app.updateStatus('Select a friendly target to heal.')); return; }
        {
          const targetH = state.players[state.selectedTarget.side].chars[state.selectedTarget.idx];
          const healer = getCurrentActor();
          const healAmt = healer.mag * (card.mult || 1);
          const resH = window.gameCore.applyHeal(targetH, healAmt);
          targetH.hp = resH.target.hp; targetH.isKO = !!resH.target.isKO;
          safe(()=>app && app.log && app.log(`${healer.name} uses ${card.name} — healed ${targetH.name} ${resH.healed || 0} (HP ${targetH.hp}/${targetH.maxHP})`));
        }
        break;
      case 'healAll':
        {
          const team = state.players[state.currentPlayer];
          const healerA = getCurrentActor();
          const healResults = window.gameCore.healAll(healerA, team.chars, card.mult || 1);
          healResults.forEach((r,i)=>{ if (!team.chars[i].isKO) { team.chars[i].hp = r.target.hp; safe(()=>app && app.log && app.log(`${healerA.name} heals ${team.chars[i].name} for ${r.healed} (HP ${team.chars[i].hp}/${team.chars[i].maxHP})`)); } });
        }
        break;
      case 'revive':
        if (!state.selectedTarget){ safe(()=>app && app.updateStatus && app.updateStatus('Select a friendly target to revive.')); return; }
        {
          const revT = state.players[state.selectedTarget.side].chars[state.selectedTarget.idx];
          if (!revT.isKO){ safe(()=>app && app.updateStatus && app.updateStatus('That character is already active.')); return; }
          const reviver = getCurrentActor();
          const revived = window.gameCore.revive(revT, reviver.mag * (card.mult || 1));
          revT.isKO = false; revT.hp = revived.target.hp;
          safe(()=>app && app.log && app.log(`${reviver.name} revived ${revT.name} to ${revT.hp} HP.`));
        }
        break;
      case 'draw':
        {
          const num = card.mult || 1;
          safe(()=>app && app.drawCardTo && app.drawCardTo(p, num));
          safe(()=>app && app.log && app.log(`${p.name} drew ${num} card(s).`));
        }
        break;
      case 'discard':
        {
          const oppP = state.players[1 - state.currentPlayer];
          let cnt = card.mult || 1;
          const dres = window.gameCore.discardFromHand(oppP.hand, cnt);
          oppP.hand = dres.hand;
          state.discard.push(...dres.removed);
          safe(()=>app && app.log && app.log(`${p.name} forced ${oppP.name} to discard ${dres.removed.length} card(s).`));
        }
        break;
      case 'steal':
        {
          const opp2 = state.players[1 - state.currentPlayer];
          if (opp2.hand.length > 0) {
            const sres = window.gameCore.stealCard(opp2.hand, p.hand);
            opp2.hand = sres.from;
            p.hand = sres.to;
            safe(()=>app && app.log && app.log(`${p.name} stole a card from ${opp2.name}.`));
            // Highlight the newly acquired card briefly before completing the play
            try {
              // mark a transient highlight on state so renderHands can style it
              state._stealHighlight = { player: state.currentPlayer, idx: p.hand.length - 1 };
              try { console.debug('actionsModule: set _stealHighlight', state._stealHighlight); } catch (e) {}
              // ensure UI reflects the new hand and highlight
              safe(()=>app && app.updateUI && app.updateUI());
              // after 500ms, clear highlight and continue post-play resolution
              setTimeout(() => {
                try {
                  delete state._stealHighlight;
                  // continue with the shared post-play actions by falling through below
                  safe(()=>app && app.updateUI && app.updateUI());
                  // Note: the shared post-play steps (moving played card to discard,
                  // marking char used, saving state, etc.) will be executed by the
                  // caller only if we return false here; we signal this by setting
                  // a flag so outer logic can skip its own completion. But since
                  // this module controls the flow, we'll perform the post-play
                  // cleanup here after the highlight.
                  // move played card to discard and finalize
                  const played = p.hand.splice(cardIdx,1)[0];
                  state.discard.push(played);
                  state.selectedCardIdx = null; state.selectedTarget = null;
                  safe(()=>app && app.markCharUsed && app.markCharUsed());
                  safe(()=>app && app.updateUI && app.updateUI());
                  safe(()=>app && app.saveState && app.saveState());
                } catch (e) { console.warn('steal highlight completion failed', e); }
              }, 500);
            } catch (e) { console.warn('steal highlight scheduling failed', e); }
            // We handled finalization asynchronously above — return now to avoid
            // running the shared post-play logic below immediately.
            return;
          } else safe(()=>app && app.log && app.log('Steal failed - opponent had no cards.'));
        }
        break;
      default:
        safe(()=>app && app.log && app.log(`Played ${card.name} (unhandled) by ${p.name}`));
    }

    // move played card to discard
    const played = p.hand.splice(cardIdx,1)[0];
    state.discard.push(played);
    state.selectedCardIdx = null; state.selectedTarget = null;
    // mark used and update UI/save
    safe(()=>app && app.markCharUsed && app.markCharUsed());
    safe(()=>app && app.updateUI && app.updateUI());
    safe(()=>app && app.saveState && app.saveState());
  }

  // Modal / Absorb flow copied from original app.js but using state and app helpers
  function openAbsorbModal(card, player, cardIdx){
    const state = getState();
    if (!state) return;
    const app = window.rpgGame && window.rpgGame.app;
    // compute actor index
    let actorIdx = state.nextCharIndex;
    while (
      actorIdx < player.chars.length &&
      (player.chars[actorIdx].isKO || player.usedThisTurn.includes(actorIdx))
    ) actorIdx++;
    const actor = player.chars[actorIdx];
    if (!actor) { safe(()=>app && app.updateStatus && app.updateStatus('No available actor to perform Absorb.')); return; }
    const cap = actor.mag * (card.mult || 1);
    const donors = [];
    state.players.forEach((pl, side)=>{
      pl.chars.forEach((ch, idx)=>{
        if (side === state.currentPlayer && idx === actorIdx) return;
        const damage = ch.maxHP - ch.hp;
        if (!ch.isKO && damage > 0) donors.push({ side, idx, char: ch, damage });
      });
    });
    if (donors.length === 0) { safe(()=>app && app.updateStatus && app.updateStatus('No valid donors with damage to absorb from.')); return; }

    // Build a basic modal in DOM similar to original; rely on app helpers for modal controls if present
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalConfirm = document.getElementById('modal-confirm');
    const modalCancel = document.getElementById('modal-cancel');
    if (!modal || !modalBody || !modalTitle) { console.warn('Modal missing for Absorb'); return; }
    modalTitle.textContent = `Absorb — ${actor.name} can absorb up to ${cap} damage`;
    modalBody.innerHTML = '';
    const info = document.createElement('div'); info.className='small-meta'; info.textContent='Enter amounts to move from each donor (total must be ≤ cap).'; modalBody.appendChild(info);
    donors.forEach((d)=>{
      const row = document.createElement('div'); row.className='donor-row';
      const name = document.createElement('div'); name.className='donor-name'; name.textContent = `${state.players[d.side].name} — ${d.char.name} (damage ${d.damage})`;
      const input = document.createElement('input'); input.type='number'; input.min=0; input.max=d.damage; input.value=0; input.dataset.side=d.side; input.dataset.idx=d.idx;
      row.appendChild(name); row.appendChild(input); modalBody.appendChild(row);
    });
    const totalEl = document.createElement('div'); totalEl.className='small-meta'; totalEl.style.marginTop='8px'; totalEl.textContent='Total: 0'; modalBody.appendChild(totalEl);
    function updateTotal(){ const inputs = Array.from(modalBody.querySelectorAll('input')); const total = inputs.reduce((s,i)=>s+Math.max(0,Number(i.value)||0),0); totalEl.textContent = `Total: ${total} (cap ${cap})`; if (total>cap) totalEl.style.color='var(--lose)'; else totalEl.style.color='var(--muted)'; }
    modalBody.querySelectorAll('input').forEach((i)=>i.addEventListener('input', updateTotal));
    modal.classList.remove('hidden');

    function safeAlert(msg){ try { window.alert(msg); } catch(e) { console.warn('alert not available:', msg); } }

    function confirm(){
      const inputs = Array.from(modalBody.querySelectorAll('input'));
      const requests = inputs.map((i)=>({ side:Number(i.dataset.side), idx:Number(i.dataset.idx), amt:Math.max(0,Number(i.value)||0) })).filter((r)=>r.amt>0);
      const total = requests.reduce((s,r)=>s+r.amt,0);
      if (total>cap){ safeAlert('Total exceeds absorb cap. Reduce amounts.'); return; }
      for (const r of requests){ const ch = state.players[r.side].chars[r.idx]; const avail = ch.maxHP - ch.hp; if (r.amt > avail) { safeAlert('A donor no longer has that much damage available.'); return; } }
      // build flat donors array
  const flatDonors = [];
      state.players.forEach((pl)=> pl.chars.forEach((ch)=> flatDonors.push({ hp: ch.hp, maxHP: ch.maxHP, isKO: !!ch.isKO })));
      const flatRequests = requests.map((r)=>{ let flatIndex=0; for (let s=0;s<r.side;s++) flatIndex += state.players[s].chars.length; flatIndex += r.idx; return { donorIndex: flatIndex, amt: r.amt }; });
      const actorForCore = { hp: actor.hp, maxHP: actor.maxHP };
  // debug logging to help headless tests trace absorb inputs
  try{ console.log('ABSORB DEBUG requests', JSON.stringify(requests)); console.log('ABSORB DEBUG flatRequests', JSON.stringify(flatRequests)); console.log('ABSORB DEBUG flatDonors', JSON.stringify(flatDonors)); console.log('ABSORB DEBUG actorForCore cap', cap, actorForCore); } catch(e){}
  let coreRes;
  try{ coreRes = window.gameCore.absorbTransfer(actorForCore, flatDonors, flatRequests, cap); } catch(e){ safeAlert('Absorb failed: '+e.message); return; }
  try{ console.log('ABSORB DEBUG coreRes', JSON.stringify(coreRes)); } catch(e){}
      // apply donors and actor back
      let flatPos = 0;
      state.players.forEach((pl)=> pl.chars.forEach((ch, idx)=>{ const d = coreRes.donors[flatPos++]; ch.hp = d.hp; ch.isKO = !!d.isKO; }));
      actor.hp = coreRes.actor.hp; actor.isKO = !!coreRes.actor.isKO;
      safe(()=>app && app.log && app.log(`${actor.name} absorbed ${coreRes.total} (self-damage).`));
      const played = player.hand.splice(cardIdx,1)[0]; state.discard.push(played);
      // close modal
      modal.classList.add('hidden'); modalBody.innerHTML='';
      safe(()=>app && app.updateUI && app.updateUI());
      safe(()=>app && app.markCharUsed && app.markCharUsed());
    }
    function cancel(){ modal.classList.add('hidden'); modalBody.innerHTML=''; }
    // wire
    modalConfirm.onclick = confirm; modalCancel.onclick = cancel;
  }

  // export
  try{ if (typeof window !== 'undefined'){ window.rpgGame = window.rpgGame || {}; window.rpgGame.actionsModule = { resolveSelectedCard: resolveSelectedCard, openAbsorbModal: openAbsorbModal }; } } catch(e){}
})();
