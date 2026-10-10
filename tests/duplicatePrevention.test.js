import test from 'node:test';
import assert from 'node:assert/strict';

import { createMatchKey, isDuplicateFixture } from '../src/services/betLedger.js';

test('Fixture keys are deterministic and case-insensitive', () => {
  const key = createMatchKey('Manchester City', 'Arsenal');
  assert.equal(key, 'manchester city|arsenal');
});

test('Duplicate detection prevents re-adding the same fixture', () => {
  const fixtures = [
    { homeTeam: 'Manchester City', awayTeam: 'Arsenal' },
    { homeTeam: 'Barcelona', awayTeam: 'Real Madrid' },
  ];

  assert.equal(isDuplicateFixture(fixtures, 'Manchester City', 'Arsenal'), true);
  assert.equal(isDuplicateFixture(fixtures, 'Liverpool', 'Chelsea'), false);
});
