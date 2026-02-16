const assert = require("assert");
const { absorbTransfer } = require("./game-core");

function testSimple() {
  const actor = { hp: 10, maxHP: 13 };
  const donors = [
    { hp: 5, maxHP: 13, isKO: false },
    { hp: 12, maxHP: 17, isKO: false },
  ];
  // donors damage: 8 and 5 => avail total 13
  const requests = [
    { donorIndex: 0, amt: 3 },
    { donorIndex: 1, amt: 2 },
  ];
  const cap = 6; // actor mag * mult
  const res = absorbTransfer(actor, donors, requests, cap);
  assert.strictEqual(res.total, 5);
  assert.strictEqual(res.actor.hp, 5);
  assert.strictEqual(res.donors[0].hp, 8); // healed by 3
  assert.strictEqual(res.donors[1].hp, 14); // healed by 2
  console.log("testSimple passed");
}

function testKOActor() {
  const actor = { hp: 2, maxHP: 10 };
  const donors = [{ hp: 5, maxHP: 10, isKO: false }];
  const req = [{ donorIndex: 0, amt: 5 }];
  const res = absorbTransfer(actor, donors, req, 5);
  assert.strictEqual(res.actor.hp, 0);
  assert.strictEqual(res.actor.isKO, true);
  assert.strictEqual(res.donors[0].hp, 10);
  console.log("testKOActor passed");
}

function testInvalid() {
  const actor = { hp: 10, maxHP: 10 };
  const donors = [{ hp: 0, maxHP: 10, isKO: true }];
  let threw = false;
  try {
    absorbTransfer(actor, donors, [{ donorIndex: 0, amt: 1 }], 5);
  } catch (e) {
    threw = true;
  }
  assert(threw, "Should throw when donor is KO");
  console.log("testInvalid passed");
}

testSimple();
testKOActor();
testInvalid();
console.log("All absorb tests passed.");
