const assert = require("assert");
const gc = require("./game-core");

function testAttackAndKO() {
  const actor = { name: "A", str: 5 };
  const target = { name: "T", hp: 6, maxHP: 6 };
  const res = gc.attack(actor, target, 1);
  assert.strictEqual(res.target.hp, 1);
  const res2 = gc.attack(actor, res.target, 1);
  assert.strictEqual(res2.target.hp, 0);
  assert.strictEqual(res2.target.isKO, true);
  console.log("testAttackAndKO passed");
}

function testDodge() {
  const actor = { name: "A", str: 4 };
  const target = { name: "T", hp: 10, maxHP: 10, dodge: true };
  const res = gc.attack(actor, target, 1);
  assert.strictEqual(res.result, "dodged");
  assert.strictEqual(res.target.dodge, false);
  console.log("testDodge passed");
}

function testCounter() {
  const actor = { name: "A", str: 3, hp: 5, maxHP: 5 };
  const target = { name: "T", hp: 10, maxHP: 10, counter: true };
  const res = gc.attack(actor, target, 2); // 6 dmg reflected
  assert.strictEqual(res.result, "countered");
  assert.strictEqual(res.attacker.hp, 0);
  assert.strictEqual(res.attacker.isKO, true);
  console.log("testCounter passed");
}

function testHealAndHealAll() {
  const healer = { name: "H", mag: 2 };
  const t1 = { name: "t1", hp: 2, maxHP: 6 };
  const t2 = { name: "t2", hp: 5, maxHP: 7 };
  const r1 = gc.applyHeal(t1, 2);
  assert.strictEqual(r1.healed, 2);
  // applyHeal returns a new target object; use it for subsequent calls
  const all = gc.healAll(healer, [r1.target, t2], 1);
  assert.strictEqual(all[0].target.hp, 6);
  assert.strictEqual(all[1].target.hp, 7);
  console.log("testHealAndHealAll passed");
}

function testRevive() {
  const dead = { name: "D", hp: 0, maxHP: 10, isKO: true };
  const r = gc.revive(dead, 4);
  assert.strictEqual(r.target.isKO, false);
  assert.strictEqual(r.target.hp, 4);
  console.log("testRevive passed");
}

function testAttackAll() {
  const actor = { name: "A", str: 2 };
  const targets = [
    { name: "a", hp: 5, maxHP: 5 },
    { name: "b", hp: 1, maxHP: 5 },
  ];
  const res = gc.attackAll(actor, targets, 2); // dmg=4
  assert.strictEqual(res[0].target.hp, 1);
  assert.strictEqual(res[1].target.hp, 0);
  assert.strictEqual(res[1].target.isKO, true);
  console.log("testAttackAll passed");
}

function testDiscardAndSteal() {
  const hand = ["a", "b", "c"];
  const r = gc.discardFromHand(hand, 2);
  assert.deepStrictEqual(r.hand, ["a"]);
  assert.deepStrictEqual(r.removed, ["c", "b"]);
  const from = ["x", "y"];
  const to = ["z"];
  const s = gc.stealCard(from, to);
  assert.deepStrictEqual(s.from, ["x"]);
  assert.deepStrictEqual(s.to, ["z", "y"]);
  assert.strictEqual(s.stolen, "y");
  console.log("testDiscardAndSteal passed");
}

function testAbsorbEdge() {
  const actor = { hp: 5, maxHP: 10 };
  const donors = [
    { hp: 3, maxHP: 10, isKO: false },
    { hp: 6, maxHP: 8, isKO: false },
  ];
  // donors damage: 7 and 2 => avail donor[0]=7, donor[1]=2
  const req = [
    { donorIndex: 0, amt: 2 },
    { donorIndex: 1, amt: 2 },
  ];
  const res = gc.absorbTransfer(actor, donors, req, 4);
  assert.strictEqual(res.total, 4);
  assert.strictEqual(res.actor.hp, 1);
  assert.strictEqual(res.donors[0].hp, 5);
  assert.strictEqual(res.donors[1].hp, 8);
  console.log("testAbsorbEdge passed");
}

// Run tests
testAttackAndKO();
testDodge();
testCounter();
testHealAndHealAll();
testRevive();
testAttackAll();
testDiscardAndSteal();
testAbsorbEdge();
console.log("All game-core tests passed.");
