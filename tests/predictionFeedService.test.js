import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPredictionCards } from '../src/services/predictionFeedService.js';

test('prediction feed uses the latest snapshot created before kickoff', () => {
  const matches = [{
    fixtureId: '1', kickoffAt: new Date('2026-10-10T18:00:00Z'),
    league: { name: 'League A' }, homeTeam: { name: 'Home' }, awayTeam: { name: 'Away' },
  }];
  const snapshots = [
    { matchId: '1', predictionTimestamp: new Date('2026-10-10T12:00:00Z'), modelVersion: 'new' },
    { matchId: '1', predictionTimestamp: new Date('2026-10-10T10:00:00Z'), modelVersion: 'old' },
    { matchId: '1', predictionTimestamp: new Date('2026-10-10T19:00:00Z'), modelVersion: 'after-kickoff' },
  ];

  const cards = buildPredictionCards(matches, snapshots);

  assert.equal(cards.length, 1);
  assert.equal(cards[0].snapshot.modelVersion, 'new');
  assert.equal(cards[0].match.homeTeam, 'Home');
});

test('prediction feed omits matches without a valid pre-kickoff snapshot', () => {
  const matches = [{
    fixtureId: '1', kickoffAt: new Date('2026-10-10T18:00:00Z'),
    league: { name: 'League A' }, homeTeam: { name: 'Home' }, awayTeam: { name: 'Away' },
  }];
  const snapshots = [{ matchId: '1', predictionTimestamp: new Date('2026-10-10T19:00:00Z') }];

  assert.deepEqual(buildPredictionCards(matches, snapshots), []);
});
