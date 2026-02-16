// Pure functions for testing core behavior

function clone(obj){ return JSON.parse(JSON.stringify(obj)); }

function applyDamage(target, dmg, attacker){
  // target, attacker are simple objects {name,hp,maxHP,isKO,dodge,counter,str,mag}
  const tgt = clone(target);
  let atk = attacker ? clone(attacker) : null;
  // Dodge cancels
  if(tgt.dodge){ tgt.dodge = false; return { target: tgt, attacker: atk, result: 'dodged' }; }
  // Counter reflects to attacker
  if(tgt.counter && atk){
    tgt.counter = false;
    atk.hp -= dmg;
    if(atk.hp < 1){ atk.hp = 0; atk.isKO = true; }
    return { target: tgt, attacker: atk, result: 'countered' };
  }
  tgt.hp -= dmg;
  if(tgt.hp < 1){ tgt.hp = 0; tgt.isKO = true; }
  return { target: tgt, attacker: atk, result: 'damaged' };
}

function applyHeal(target, amt){
  const tgt = clone(target);
  if(tgt.isKO) return { target: tgt, result: 'ko' };
  const prev = tgt.hp;
  tgt.hp = Math.min(tgt.maxHP, tgt.hp + amt);
  return { target: tgt, healed: tgt.hp - prev, result: 'healed' };
}

function revive(target, amt){
  const tgt = clone(target);
  if(!tgt.isKO) return { target: tgt, result: 'already' };
  tgt.isKO = false;
  tgt.hp = Math.min(tgt.maxHP, amt);
  return { target: tgt, result: 'revived' };
}

function attack(actor, target, mult=1){
  const dmg = (actor.str||0) * mult;
  return applyDamage(target, dmg, actor);
}

function attackAll(actor, targets, mult=1){
  return targets.map(t=>attack(actor, t, mult));
}

function healAll(healer, targets, mult=1){
  const amt = (healer.mag||0) * mult;
  return targets.map(t=>applyHeal(t, amt));
}

function discardFromHand(hand, count){
  // deterministic: remove from end
  const handCopy = hand.slice();
  const removed = [];
  for(let i=0;i<count;i++){
    if(handCopy.length===0) break;
    removed.push(handCopy.pop());
  }
  return { hand: handCopy, removed };
}

function stealCard(fromHand, toHand){
  const from = fromHand.slice(); const to = toHand.slice();
  if(from.length===0) return { from, to, stolen:null };
  const stolen = from.pop(); to.push(stolen);
  return { from, to, stolen };
}

function absorbTransfer(actor, donors, requests, cap){
  // actor: {hp, maxHP}
  // donors: array {hp,maxHP,isKO}
  const total = requests.reduce((s,r)=>s + r.amt, 0);
  if(total > cap) throw new Error('Exceeded cap');
  requests.forEach(r=>{
    const d = donors[r.donorIndex];
    if(!d) throw new Error('Invalid donor');
    if(d.isKO) throw new Error('Cannot absorb from KO donor');
    const avail = d.maxHP - d.hp;
    if(r.amt > avail) throw new Error('Requested more than donor damage');
  });
  const actorCopy = clone(actor);
  const donorsCopy = donors.map(d=>clone(d));
  requests.forEach(r=>{ donorsCopy[r.donorIndex].hp = Math.min(donorsCopy[r.donorIndex].maxHP, donorsCopy[r.donorIndex].hp + r.amt); });
  actorCopy.hp -= total;
  if(actorCopy.hp < 1){ actorCopy.hp = 0; actorCopy.isKO = true; }
  return { actor: actorCopy, donors: donorsCopy, total };
}

module.exports = { applyDamage, applyHeal, revive, attack, attackAll, healAll, discardFromHand, stealCard, absorbTransfer };
