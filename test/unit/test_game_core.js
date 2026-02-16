const { expect } = require('chai');
const gc = require('../../game-core');

describe('game-core absorbTransfer', () => {
  it('simple absorb reduces actor hp and heals donors', () => {
    const actor = { hp: 10, maxHP: 13 };
    const donors = [
      { hp: 5, maxHP: 13, isKO: false },
      { hp: 12, maxHP: 17, isKO: false },
    ];
    const requests = [
      { donorIndex: 0, amt: 3 },
      { donorIndex: 1, amt: 2 },
    ];
    const cap = 6;
    const res = gc.absorbTransfer(actor, donors, requests, cap);
    expect(res.total).to.equal(5);
    expect(res.actor.hp).to.equal(5);
    expect(res.donors[0].hp).to.equal(8);
    expect(res.donors[1].hp).to.equal(14);
  });

  it('actor can be KO by absorb', () => {
    const actor = { hp: 2, maxHP: 10 };
    const donors = [{ hp: 5, maxHP: 10, isKO: false }];
    const req = [{ donorIndex: 0, amt: 5 }];
    const res = gc.absorbTransfer(actor, donors, req, 5);
    expect(res.actor.hp).to.equal(0);
    expect(res.actor.isKO).to.be.true;
    expect(res.donors[0].hp).to.equal(10);
  });

  it('throws when donor is KO or requests exceed availability', () => {
    const actor = { hp: 10, maxHP: 10 };
    const donors = [{ hp: 0, maxHP: 10, isKO: true }];
    expect(() => gc.absorbTransfer(actor, donors, [{ donorIndex: 0, amt: 1 }], 5)).to.throw();
  });
});
