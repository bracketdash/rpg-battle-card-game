const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Simple UI test for Attack All flow — deterministic and less prone to timing flakes.
describe('UI / AttackAll flow', function () {
  this.timeout(8000);

  it('playing Attack All updates opponent or actor HP', async () => {
    const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
    const snap = {
      players: [
        { id: 1, name: 'P1', chars: [ { name: 'Actor', hp: 10, maxHP: 13, str: 3, mag: 1, isKO: false } ], hand: [ { name: 'Sweep', type: 'attackAll', mult: 1 } ], usedThisTurn: [] },
        { id: 2, name: 'P2', chars: [ { name: 'T1', hp: 8, maxHP: 10, isKO: false }, { name: 'T2', hp: 9, maxHP: 10, isKO: false } ], hand: [], usedThisTurn: [] },
      ],
      deck: [], discard: [], draftPool: [], draftTurn: 0, draftPicksPerPlayer: 1,
      currentPlayer: 0, nextCharIndex: 0, selectedCardIdx: null, selectedTarget: null,
    };

    const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/' });
    dom.window.localStorage.setItem('rpg_battle_state_v1', JSON.stringify(snap));
    dom.window.eval(fs.readFileSync(path.join(__dirname, '../../game-core-browser.js'), 'utf8'));
    dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-state.js'), 'utf8'));
    dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-ui.js'), 'utf8'));
    dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-actions.js'), 'utf8'));
    dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-turns.js'), 'utf8'));
    dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-modal.js'), 'utf8'));
    dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app.js'), 'utf8'));

    // wait for hand render
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
    const before = hooks.getSnapshot();
    const actorBefore = before.players[0].chars[0];
    const t1Before = before.players[1].chars[0];
    const t2Before = before.players[1].chars[1];

    const hand1 = dom.window.document.getElementById('hand-1');
    const atkCard = hand1.children[0];
    atkCard.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const playBtn = dom.window.document.querySelector('.play-selected[data-player="0"]');
    playBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 60));

    const after = hooks.getSnapshot();
    const actorAfter = after.players[0].chars[0];
    const t1After = after.players[1].chars[0];
    const t2After = after.players[1].chars[1];

    // At least one of the opponent characters should have changed HP or the actor may have taken damage (counter)
    const opponentChanged = (t1After.hp !== t1Before.hp) || (t2After.hp !== t2Before.hp);
    expect(opponentChanged || actorAfter.hp < actorBefore.hp).to.be.true;
  });
});

