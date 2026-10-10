import test from 'node:test';
import assert from 'node:assert/strict';

import { buildExactScoreDistribution, calculateMarketsFromDistribution, poissonProbability } from '../src/services/predictionEngine.js';

test('Poisson probability yields a valid single-event probability', () => {
  const probability = poissonProbability(1.5, 2);
  assert.ok(probability > 0 && probability < 1);
});

test('Score distribution normalizes to about 1.0', () => {
  const distribution = buildExactScoreDistribution(1.5, 1.1, 4);
  const total = Object.values(distribution).reduce((sum, value) => sum + value, 0);
  assert.ok(Math.abs(total - 1) < 1e-6, `Distribution total was ${total}`);
});

test('Outcome probabilities remain mutually consistent and sum to around 1.0', () => {
  const distribution = buildExactScoreDistribution(1.8, 1.2, 5);
  const markets = calculateMarketsFromDistribution(distribution);
  const total = markets.homeWin + markets.draw + markets.awayWin;
  assert.ok(Math.abs(total - 1) < 1e-5, `Outcome total was ${total}`);
  assert.ok(markets.homeWin > 0 && markets.draw > 0 && markets.awayWin > 0);
});
