import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateProfitLoss, settleBet } from '../src/services/betLedger.js';

test('A winning bet generates a positive profit', () => {
  const settled = settleBet({ stake: 20, odds: 2.5, selection: 'Home Win' }, { home: 2, away: 0 });
  assert.equal(settled.status, 'won');
  assert.equal(settled.profitLoss, 30);
});

test('A losing bet generates a negative result', () => {
  const bet = { stake: 20, odds: 2.5, selection: 'Home Win', status: 'pending' };
  const settled = settleBet(bet, { home: 0, away: 1 });
  assert.equal(settled.status, 'lost');
  assert.equal(settled.profitLoss, -20);
});

test('Profit/loss calculation respects wins and void settlements', () => {
  assert.equal(calculateProfitLoss({ stake: 10, odds: 2.0, status: 'won' }), 10);
  assert.equal(calculateProfitLoss({ stake: 10, odds: 2.0, status: 'lost' }), -10);
  assert.equal(calculateProfitLoss({ stake: 10, odds: 2.0, status: 'void' }), 0);
});
