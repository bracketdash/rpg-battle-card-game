const assert = require('assert');
const gc = require('../../game-core');

function test_revive_and_ko() {
  const dead = { name: 'D', hp: 0, maxHP: 10, isKO: true };
  const r = gc.revive(dead, 4);
  assert.strictEqual(r.target.isKO, false);
  assert.strictEqual(r.target.hp, 4);
  // revive should not exceed maxHP
  const r2 = gc.revive({ name: 'D2', hp:0, maxHP:5, isKO:true }, 10);
  assert.strictEqual(r2.target.hp, 5);
  console.log('test_revive_and_ko passed');
}

function test_heal_does_not_affect_ko() {
  const dead = { name: 'Dead', hp: 0, maxHP: 6, isKO: true };
  const res = gc.applyHeal(dead, 3);
  assert.strictEqual(res.result, 'ko');
  assert.strictEqual(res.target.hp, 0);
  console.log('test_heal_does_not_affect_ko passed');
}

function test_win_detection_logic_simulation() {
  // simulate two players with character lists and detect winner
  const players = [
    { id:1, chars:[ {name:'a', isKO:true}, {name:'b', isKO:true} ] },
    { id:2, chars:[ {name:'c', isKO:false}, {name:'d', isKO:true} ] },
  ];
  const aliveCounts = players.map(p => (p.chars||[]).filter(c => !c.isKO).length);
  assert.deepStrictEqual(aliveCounts, [0,1]);
  const playersRemaining = aliveCounts.filter(n => n>0).length;
  assert.strictEqual(playersRemaining, 1);
  const winnerIdx = aliveCounts.findIndex(n => n>0);
  assert.strictEqual(winnerIdx, 1);
  console.log('test_win_detection_logic_simulation passed');
}

function test_draw_rule() {
  // end-turn draw rule: if hand <5 draw to 5; if hand >=5 draw 1
  function toDraw(handLength){ if (handLength >= 5) return 1; return Math.max(0, 5 - handLength); }
  assert.strictEqual(toDraw(0), 5);
  assert.strictEqual(toDraw(4), 1);
  assert.strictEqual(toDraw(5), 1);
  assert.strictEqual(toDraw(6), 1);
  console.log('test_draw_rule passed');
}

// Run tests
try{
  test_revive_and_ko();
  test_heal_does_not_affect_ko();
  test_win_detection_logic_simulation();
  test_draw_rule();
  console.log('All flow tests passed.');
} catch (e) {
  console.error('Flow tests failed', e);
  process.exit(1);
}
