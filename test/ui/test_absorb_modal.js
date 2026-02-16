const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Storage key used by the app
const STORAGE_KEY = 'rpg_battle_state_v1';

describe('UI / Absorb modal flow', function () {
  this.timeout(8000);

  it('plays Absorb via modal and updates actor and donors', async () => {
    const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
    // create a snapshot where game is ready and current player has an Absorb card
    const snap = {
      players: [
        {
          id: 1,
          name: 'Player 1',
          chars: [
            { name: 'Actor', hp: 10, maxHP: 13, str: 3, mag: 3, isKO: false },
          ],
          hand: [{ name: 'Absorb', type: 'absorb', mult: 1, desc: 'Absorb card' }],
          usedThisTurn: [],
        },
        {
          id: 2,
          name: 'Player 2',
          chars: [
            { name: 'Donor', hp: 8, maxHP: 13, str: 2, mag: 1, isKO: false },
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
    };

  // Provide an http origin so localStorage is available (not an opaque origin).
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/' });
    // seed localStorage before loading app so loadState picks it up
  dom.window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
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

  // click the absorb card (first card in hand)
    const hand1 = dom.window.document.getElementById('hand-1');
    const cardEl = hand1.children[0];
    expect(cardEl).to.exist;
    cardEl.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 40));
  // trigger Play Selected button for player 1 (data-player="0") to open Absorb modal
  const playBtn = dom.window.document.querySelector('.play-selected[data-player="0"]');
  expect(playBtn).to.exist;
  playBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 40));

    // modal should be visible and contain input(s)
    const modal = dom.window.document.getElementById('modal');
    expect(modal.classList.contains('hidden')).to.be.false;
    const inputs = modal.querySelectorAll('input');
    expect(inputs.length).to.be.greaterThan(0);

    // set first input to 2 (donor had damage 5, actor cap is mag*mult = 3)
    inputs[0].value = 2;
    inputs[0].dispatchEvent(new dom.window.Event('input'));
    await new Promise((r) => setTimeout(r, 20));

    // confirm
    const confirm = dom.window.document.getElementById('modal-confirm');
    confirm.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 60));

    // Verify snapshot shows actor lost hp and donor gained hp; card moved to discard
    const hooks = dom.window.rpgGame.testHooks;
    const after = hooks.getSnapshot();
    const actor = after.players[0].chars[0];
    const donor = after.players[1].chars[0];
    expect(actor.hp).to.equal(8); // actor 10 - 2 = 8
    expect(donor.hp).to.equal(10); // donor 8 + 2 = 10
    expect(after.discard.length).to.equal(1);
    expect(after.discard[0].type).to.equal('absorb');
  });
});
