const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('UI / pick and start flow', function () {
  this.timeout(8000);

  let dom;
  beforeEach(() => {
    const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
  dom = new JSDOM(html, { runScripts: 'outside-only' });
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../../game-core-browser.js'), 'utf8'));
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-state.js'), 'utf8'));
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-ui.js'), 'utf8'));
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-actions.js'), 'utf8'));
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-turns.js'), 'utf8'));
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-modal.js'), 'utf8'));
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app.js'), 'utf8'));
  });

  it('clicking an available char moves it to player area', async () => {
    const avail = dom.window.document.getElementById('available-characters');
    await new Promise((resolve, reject) => {
      const start = Date.now();
      (function check() {
        if (avail && avail.children.length > 0) return resolve();
        if (Date.now() - start > 2000) return reject(new Error('timeout'));
        setTimeout(check, 20);
      })();
    });
    const before = avail.children.length;
    const first = avail.children[0];
    expect(first).to.exist;
    first.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 50));
    const after = avail.children.length;
    expect(after).to.equal(before - 1);
    const p0chars = dom.window.document.getElementById('player-1-chars');
    expect(p0chars.children.length).to.be.greaterThan(0);
  });

  it('finishing the draft starts the game and shows hands', async () => {
    const avail = dom.window.document.getElementById('available-characters');
    await new Promise((resolve, reject) => {
      const start = Date.now();
      (function check() {
        if (avail && avail.children.length > 0) return resolve();
        if (Date.now() - start > 2000) return reject(new Error('timeout'));
        setTimeout(check, 20);
      })();
    });
    // pick until 6 picks made (3 each)
    while ((dom.window.document.getElementById('player-1-chars').children.length + dom.window.document.getElementById('player-2-chars').children.length) < 6) {
      const el = dom.window.document.getElementById('available-characters').children[0];
      if (!el) break;
      el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
      await new Promise(r => setTimeout(r, 40));
    }
    // After picks, game should start
    const handAreas = Array.from(dom.window.document.querySelectorAll('.hand-area'));
    const visible = handAreas.every(h => dom.window.getComputedStyle(h).display !== 'none');
    expect(visible).to.be.true;
    const draftScreen = dom.window.document.getElementById('draft-screen');
    expect(draftScreen.classList.contains('hidden')).to.be.true;
  });
});
