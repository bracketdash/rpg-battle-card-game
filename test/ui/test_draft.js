const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('UI / Draft rendering', function () {
  this.timeout(5000);

  it('renders available characters on load', async () => {
    const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  // load scripts in order (include app-state module)
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../../game-core-browser.js'), 'utf8'));
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-state.js'), 'utf8'));
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-ui.js'), 'utf8'));
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-actions.js'), 'utf8'));
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-turns.js'), 'utf8'));
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app-modal.js'), 'utf8'));
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../../app.js'), 'utf8'));

    // wait until available-characters populated
    await new Promise((resolve, reject) => {
      const start = Date.now();
      (function check() {
        const avail = dom.window.document.getElementById('available-characters');
        if (avail && avail.children.length > 0) return resolve();
        if (Date.now() - start > 2000) return reject(new Error('timeout waiting for available-characters'));
        setTimeout(check, 20);
      })();
    });

    const avail = dom.window.document.getElementById('available-characters');
    expect(avail).to.exist;
    expect(avail.children.length).to.be.greaterThan(0);
  });
});
