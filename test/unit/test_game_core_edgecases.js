const { expect } = require('chai');
const gc = require('../../game-core');

describe('game-core edge cases and immutability', () => {
  it('applyDamage without attacker should still damage and not counter', () => {
    const target = { name: 'T', hp: 5, maxHP: 5 };
    const res = gc.applyDamage(target, 3, null);
    expect(res.result).to.equal('damaged');
    expect(res.target.hp).to.equal(2);
    expect(res.attacker).to.be.null;
  });

  it('applyDamage counter does not trigger if attacker is missing', () => {
    const target = { name: 'T', hp: 5, maxHP: 5, counter: true };
    const res = gc.applyDamage(target, 3, null);
    // since attacker is null, counter branch shouldn't run
    expect(res.result).to.equal('damaged');
    expect(res.target.isKO).to.be.undefined;
  });

  it('applyHeal does not exceed maxHP and reports healed amount', () => {
    const target = { hp: 2, maxHP: 5, isKO: false };
    const r = gc.applyHeal(target, 10);
    expect(r.result).to.equal('healed');
    expect(r.target.hp).to.equal(5);
    expect(r.healed).to.equal(3);
  });

  it('revive returns already when target is not KO', () => {
    const t = { hp: 3, maxHP: 10, isKO: false };
    const r = gc.revive(t, 5);
    expect(r.result).to.equal('already');
    expect(r.target.hp).to.equal(3);
  });

  it('attackAll on empty targets returns empty array', () => {
    const a = { name: 'X', str: 4 };
    const res = gc.attackAll(a, [], 1);
    expect(res).to.deep.equal([]);
  });

  it('healAll with multiplier applies correct total heal per target', () => {
    const healer = { mag: 2 };
    const targets = [{ hp: 1, maxHP: 10, isKO: false }];
    const res = gc.healAll(healer, targets, 3); // amt = 6
    expect(res[0].target.hp).to.equal(7);
  });

  it('discardFromHand with count larger than hand empties hand and returns all removed', () => {
    const hand = ['a','b'];
    const orig = hand.slice();
    const r = gc.discardFromHand(hand, 5);
    expect(r.hand).to.deep.equal([]);
    expect(r.removed).to.deep.equal(['b','a']);
    // original hand should not be mutated
    expect(hand).to.deep.equal(orig);
  });

  it('stealCard preserves original arrays and returns null when from empty', () => {
    const from = [];
    const to = ['z'];
    const fromOrig = from.slice();
    const toOrig = to.slice();
    const r = gc.stealCard(from, to);
    expect(r.stolen).to.be.null;
    expect(from).to.deep.equal(fromOrig);
    expect(to).to.deep.equal(toOrig);
  });

  it('absorbTransfer throws on invalid donor index and on cap exceed', () => {
    const actor = { hp: 10, maxHP: 10 };
    const donors = [{ hp: 1, maxHP: 5, isKO: false }];
    // invalid donor index
    expect(() => gc.absorbTransfer(actor, donors, [{ donorIndex: 5, amt: 1 }], 10)).to.throw();
    // cap exceed
    expect(() => gc.absorbTransfer(actor, donors, [{ donorIndex: 0, amt: 3 }], 2)).to.throw();
  });

  it('attack with actor without str deals zero damage', () => {
    const actor = { name: 'X' };
    const target = { hp: 5, maxHP: 5 };
    const r = gc.attack(actor, target, 1);
    expect(r.target.hp).to.equal(5);
  });
});
