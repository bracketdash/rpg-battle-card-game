const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const indexPath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');

const dom = new JSDOM(html, { runScripts: 'outside-only', resources: 'usable', url: 'http://localhost/' });
function runScriptInWindow(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  dom.window.eval(code);
}

function waitFor(fn, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      try {
        if (fn()) return resolve();
      } catch (e) {}
      if (Date.now() - start > timeout) return reject(new Error('timeout'));
      setTimeout(check, 20);
    })();
  });
}

(async () => {
  try {
    await waitFor(() => dom.window.document.readyState === 'complete' || dom.window.document.readyState === 'interactive', 2000);
    runScriptInWindow(path.join(__dirname, 'game-core-browser.js'));
    runScriptInWindow(path.join(__dirname, 'app.js'));

    const avail = dom.window.document.getElementById('available-characters');
    await waitFor(() => avail && avail.children.length > 0, 1500);

    const before = avail.children.length;
    // click the first available character
    const first = avail.children[0];
    if (!first) throw new Error('No character to click');
    // dispatch a click
    const ev = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true });
    first.dispatchEvent(ev);
    // wait a tick for UI to update
    await new Promise((r) => setTimeout(r, 50));

    const after = avail.children.length;
    console.log('available before=', before, 'after=', after);
    if (!(after === before - 1)) throw new Error('Click did not remove a card from available pool');

    // ensure player's characters contain the new pick
    const p0chars = dom.window.document.getElementById('player-1-chars');
    if (!p0chars) throw new Error('player-1-chars not present');
    const p0count = p0chars.children.length;
    if (p0count === 0) throw new Error('Picked character not added to player area');

    console.log('UI pick test passed');
    process.exit(0);
  } catch (e) {
    console.error('UI pick test failed:', e && e.stack ? e.stack : e);
    process.exit(2);
  }
})();
