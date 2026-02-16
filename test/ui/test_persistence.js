const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('UI / persistence and undo/redo', function () {
  this.timeout(8000);

  let dom;
  beforeEach(() => {
    const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
  dom = new JSDOM(html, { runScripts: 'outside-only' });
  // load core, state module and app scripts
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../../game-core-browser.js'), 'utf8'));
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-state.js'), 'utf8'));
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-ui.js'), 'utf8'));
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-actions.js'), 'utf8'));
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-turns.js'), 'utf8'));
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-modal.js'), 'utf8'));
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app.js'), 'utf8'));
  });

  it('save, undo and redo restore prior picks', async () => {
    const w = dom.window;
    await new Promise((resolve, reject) => {
      const start = Date.now();
      (function check() {
        const avail = w.document.getElementById('available-characters');
        if (avail && avail.children.length > 0) return resolve();
        if (Date.now() - start > 2000) return reject(new Error('timeout waiting for available-characters'));
        setTimeout(check, 20);
      })();
    });

    const hooks = w.rpgGame.testHooks;
    expect(hooks).to.exist;

    const snap0 = hooks.getSnapshot();
    hooks.saveState(true);

    // perform a pick
    hooks.pickChar(0);
    await new Promise((r) => setTimeout(r, 60));

    const snapAfterPick = hooks.getSnapshot();
    expect(snapAfterPick.players[0].chars.length + snapAfterPick.players[1].chars.length).to.be.greaterThan(
      snap0.players[0].chars.length + snap0.players[1].chars.length,
    );

    // Undo
    hooks.undo();
    await new Promise((r) => setTimeout(r, 60));
    const snapAfterUndo = hooks.getSnapshot();
    expect(snapAfterUndo.players[0].chars.length + snapAfterUndo.players[1].chars.length).to.equal(
      snap0.players[0].chars.length + snap0.players[1].chars.length,
    );

    // Redo
    hooks.redo();
    await new Promise((r) => setTimeout(r, 60));
    const snapAfterRedo = hooks.getSnapshot();
    expect(snapAfterRedo.players[0].chars.length + snapAfterRedo.players[1].chars.length).to.equal(
      snapAfterPick.players[0].chars.length + snapAfterPick.players[1].chars.length,
    );
  });
});
