import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAccumulatorSelections } from '../src/services/accumulatorService.js';

test('Accumulator builder respects the maximum number of legs', () => {
  const predictions = [
    { match: 'A vs B', market: '1X2', selection: 'Home Win', probability: 0.7 },
    { match: 'C vs D', market: '1X2', selection: 'Away Win', probability: 0.55 },
    { match: 'E vs F', market: 'BTTS', selection: 'Yes', probability: 0.58 },
    { match: 'G vs H', market: 'Over 2.5', selection: 'Yes', probability: 0.62 },
    { match: 'I vs J', market: '1X2', selection: 'Draw', probability: 0.4 },
  ];

  const result = buildAccumulatorSelections(predictions, { maxLegs: 3, minProbability: 0.4 });
  assert.equal(result.legs.length, 3);
  assert.ok(result.conservativeProbability <= 1);
});
