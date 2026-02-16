const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Helper: poll until predicate(snapshot) returns true or timeout
function waitForSnapshot(hooks, predicate, timeout = 1000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function poll() {
      const snap = hooks.getSnapshot();
      try {
        if (predicate(snap)) return resolve(snap);
      } catch (e) {
        // ignore predicate errors and keep polling
      }
      if (Date.now() - start > timeout) return reject(new Error('timeout waiting for snapshot predicate'));
      setTimeout(poll, 25);
    })();
  });
}

describe('UI / Absorb permutations (synchronized)', function () {
  this.timeout(10000);

  it('handles attackAll then Absorb across multiple donors with counter/dodge', async () => {
    const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
    // Seed snapshot: P0 has two actors so the first can attackAll and the second can later Absorb
    const snap = {
      players: [
        {
          id: 1,
          name: 'Player 1',
          chars: [
            { name: 'Attacker', hp: 12, maxHP: 13, str: 3, mag: 0, isKO: false },
            { name: 'Absorber', hp: 12, maxHP: 13, str: 1, mag: 3, isKO: false },
          ],
          hand: [ { name: 'Sweep', type: 'attackAll', mult: 1 }, { name: 'Absorb', type: 'absorb', mult: 1 } ],
          usedThisTurn: [],
        },
        {
          id: 2,
          name: 'Player 2',
          chars: [
            { name: 'Donor1', hp: 4, maxHP: 10, counter: true, dodge: false, isKO: false }, // has counter
            { name: 'Donor2', hp: 7, maxHP: 10, counter: false, dodge: true, isKO: false }, // has dodge
            { name: 'Donor3', hp: 6, maxHP: 10, counter: false, dodge: false, isKO: false },
          ],
          hand: [],
          usedThisTurn: [],
        },
      ],
      deck: [],
      discard: [],
      draftPool: [],
      draftTurn: 0,
      draftPicksPerPlayer: 1,
      currentPlayer: 0,
      nextCharIndex: 0,
      selectedCardIdx: null,
      selectedTarget: null,
    };

    const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/' });
  // stub alert for jsdom (not implemented in jsdom)
  dom.window.alert = function(){ /* noop in headless tests */ };
    dom.window.localStorage.setItem('rpg_battle_state_v1', JSON.stringify(snap));
    dom.window.eval(fs.readFileSync(path.join(__dirname, '../../game-core-browser.js'), 'utf8'));
    dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-state.js'), 'utf8'));
    dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-ui.js'), 'utf8'));
    dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-actions.js'), 'utf8'));
    dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-turns.js'), 'utf8'));
    dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-modal.js'), 'utf8'));
    dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app.js'), 'utf8'));

    // wait for hand to render
    await new Promise((resolve, reject) => {
      const start = Date.now();
      (function check() {
        const hand = dom.window.document.getElementById('hand-1');
        if (hand && hand.children.length > 0) return resolve();
        if (Date.now() - start > 2000) return reject(new Error('timeout waiting for hand-1'));
        setTimeout(check, 20);
      })();
    });

    const hooks = dom.window.rpgGame.testHooks;

    // Record pre-state
    const before = hooks.getSnapshot();
    const actorBefore = before.players[0].chars[0];
    const donorsBefore = before.players[1].chars.map((c) => ({ hp: c.hp, dodge: !!c.dodge, counter: !!c.counter }));

    // Play Attack All
    const hand1 = dom.window.document.getElementById('hand-1');
    const atkCard = hand1.children[0];
    atkCard.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const playBtn = dom.window.document.querySelector('.play-selected[data-player="0"]');
    playBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

  // Give the app a short moment to process the attackAll
  await new Promise((r) => setTimeout(r, 200));
  const afterAtk = hooks.getSnapshot();
    // Ensure that flags (dodge/counter) are not still true on donors that had them
    const dAfter = afterAtk.players[1].chars;
    expect(dAfter[0].counter).to.not.be.true; // Donor1 counter should be cleared or non-true
    expect(dAfter[1].dodge).to.not.be.true; // Donor2 dodge should be cleared or non-true

    // Now play Absorb: click absorb card and open modal
    const handNow = dom.window.document.getElementById('hand-1');
    const absorbCard = handNow.querySelector('.card');
    expect(absorbCard).to.exist;
    absorbCard.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const playBtn2 = dom.window.document.querySelector('.play-selected[data-player="0"]');
    playBtn2.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

    // Wait for modal to appear and inputs to be present
    await waitForSnapshot(hooks, (s) => {
      const modal = dom.window.document.getElementById('modal');
      return modal && !modal.classList.contains('hidden') && modal.querySelectorAll('input').length > 0;
    }, 1000);

    const modal = dom.window.document.getElementById('modal');
    const inputs = modal.querySelectorAll('input');
    // Fill inputs: distribute cap across donors (cap = actor.mag * mult)
    // Actor mag is 3, cap = 3
    // choose amounts within donors' available damage
    inputs.forEach((inp, i) => {
      const val = i === 0 ? 1 : (i === 1 ? 1 : 1); // total 3
      inp.value = val; inp.dispatchEvent(new dom.window.Event('input'));
    });

  // sanity: ensure inputs reflect requested total
  const totalRequested = Array.from(inputs).reduce((s,i)=>s + (Number(i.value)||0), 0);
  expect(totalRequested).to.be.above(0);

    // Confirm
    const confirm = dom.window.document.getElementById('modal-confirm');
  // ensure confirm exists and invoke it
  // console.debug('CONFIRM ELEM', !!confirm, 'onclick-type', confirm ? typeof confirm.onclick : 'no-elem');
    // try calling onclick directly (some jsdom setups wire handlers this way), fall back to dispatchEvent
    if (confirm && typeof confirm.onclick === 'function') {
      console.log('INVOKING confirm.onclick()');
      confirm.onclick();
    } else if (confirm) {
      console.log('DISPATCHING click event on confirm');
      confirm.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    } else {
      console.log('No confirm button found in modal');
    }

  // Wait briefly for DOM/state to settle after confirming absorb
  await new Promise((r) => setTimeout(r, 200));
  const afterAbsorb = hooks.getSnapshot();
    // absorber is the second char (index 1)
    const absorberBefore = afterAtk.players[0].chars[1];
    const aAfter = afterAbsorb.players[0].chars[1];
    const donorsFinal = afterAbsorb.players[1].chars;
    // Ensure donors did not lose HP relative to after the attack (absorbing shouldn't damage donors)
    donorsFinal.forEach((d, i) => expect(d.hp).to.be.at.least(afterAtk.players[1].chars[i].hp));
  });
});
