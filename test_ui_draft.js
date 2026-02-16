const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Load index.html
const indexPath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');

// Create JSDOM but do NOT auto-run external scripts; we'll load them in order
// after the DOM is ready to ensure querySelector lookups in app.js succeed.
const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  resources: 'usable',
  url: 'http://localhost/',
});

// Helper to load and execute a script file inside the JSDOM window
function runScriptInWindow(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  // Evaluate in the window context so top-level DOM queries operate on the
  // already-parsed document.
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
    // Ensure the DOM parsed
    await waitFor(() => dom.window.document.readyState === 'complete' || dom.window.document.readyState === 'interactive', 2000);

    // Load game-core-browser then app.js in the JSDOM window (same order as index.html)
    runScriptInWindow(path.join(__dirname, 'game-core-browser.js'));
    runScriptInWindow(path.join(__dirname, 'app.js'));

    // Wait for renderDraft to populate #available-characters
    const avail = dom.window.document.getElementById('available-characters');
    await waitFor(() => avail && avail.children.length > 0, 1500);
    const display = avail && avail.style && avail.style.display;
    const children = avail ? avail.children.length : 0;

    console.log('available-characters display=', display, 'children=', children);

    if (!avail) throw new Error('#available-characters not found');
    if (children === 0) throw new Error('#available-characters has no children — draft pool not rendered');

    // ensure player panels are visible
    const panels = Array.from(dom.window.document.querySelectorAll('.player-panel'));
    const panelsDisplay = panels.map(p=>dom.window.getComputedStyle(p).display);
    console.log('player-panels display:', panelsDisplay.join(','));

    // Test passes
    console.log('UI draft test passed');
    process.exit(0);
  } catch (e) {
    console.error('UI draft test failed:', e && e.stack ? e.stack : e);
    process.exit(2);
  }
})();
