const { expect } = require('chai');
const gc = require('../../game-core');

describe('game-core additional behaviors', () => {
  it('applyDamage respects dodge and clears it', () => {
    const target = { name: 'T', hp: 10, maxHP: 10, dodge: true };
    const attacker = { name: 'A', hp: 10 };
    const res = gc.applyDamage(target, 3, attacker);
    expect(res.result).to.equal('dodged');
    expect(res.target.dodge).to.be.false;
    expect(res.target.hp).to.equal(10);
  });

  it('applyDamage counter reflects damage to attacker and may KO', () => {
    const target = { name: 'T', hp: 10, maxHP: 10, counter: true };
    const attacker = { name: 'A', hp: 2 };
    const res = gc.applyDamage(target, 3, attacker);
    expect(res.result).to.equal('countered');
    expect(res.attacker.hp).to.equal(0);
    expect(res.attacker.isKO).to.be.true;
  });

  it('attackAll handles mixed results', () => {
    const actor = { name: 'Hero', str: 2 };
    const t1 = { name: 'one', hp: 5, maxHP: 5, dodge: true };
    const t2 = { name: 'two', hp: 3, maxHP: 5, counter: true };
    const results = gc.attackAll(actor, [t1, t2], 1);
    expect(results).to.have.length(2);
    expect(results[0].result).to.equal('dodged');
    expect(results[1].result).to.be.oneOf(['countered','damaged']);
  });

  it('healAll heals non-KO targets and leaves KO unchanged', () => {
    const healer = { name: 'Cleric', mag: 3 };
    const t1 = { name: 'a', hp: 1, maxHP: 5, isKO: false };
    const t2 = { name: 'b', hp: 0, maxHP: 5, isKO: true };
    const res = gc.healAll(healer, [t1, t2], 1);
    expect(res[0].result).to.equal('healed');
    expect(res[1].result).to.equal('ko');
  });

  it('discardFromHand removes from end deterministically', () => {
    const hand = ['a','b','c','d'];
    const r = gc.discardFromHand(hand, 2);
    expect(r.hand).to.deep.equal(['a','b']);
    expect(r.removed).to.deep.equal(['d','c']);
  });

  it('stealCard from empty returns stolen null', () => {
    const res = gc.stealCard([], ['x']);
    expect(res.stolen).to.be.null;
    expect(res.from).to.deep.equal([]);
    expect(res.to).to.deep.equal(['x']);
  });
});
