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

    // wait for draft pool
    const avail = dom.window.document.getElementById('available-characters');
    await waitFor(() => avail && avail.children.length > 0, 1500);

    // simulate picking enough characters to finish draft (3 picks each)
    // We'll click alternately to simulate two players
    while ((dom.window.document.getElementById('player-1-chars').children.length + dom.window.document.getElementById('player-2-chars').children.length) < 6) {
      const first = avail.children[0];
      if (!first) break;
      first.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
      // small delay to allow handlers
      await new Promise((r) => setTimeout(r, 30));
    }

    // Now draft should be complete and startGame should have been invoked automatically
    // Check that hand areas are visible
    const handAreas = Array.from(dom.window.document.querySelectorAll('.hand-area'));
    const visible = handAreas.every(h => dom.window.getComputedStyle(h).display !== 'none');
    console.log('handAreas visible:', visible);
    if (!visible) throw new Error('Hand areas not visible after starting game');

    // Also ensure draftScreen hidden
    const draftScreen = dom.window.document.getElementById('draft-screen');
    const draftHidden = draftScreen.classList.contains('hidden');
    console.log('draftScreen hidden:', draftHidden);
    if (!draftHidden) throw new Error('Draft screen still visible after starting game');

    console.log('UI startGame test passed');
    process.exit(0);
  } catch (e) {
    console.error('UI startGame test failed:', e && e.stack ? e.stack : e);
    process.exit(2);
  }
})();
