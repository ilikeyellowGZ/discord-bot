import test from 'node:test';
import assert from 'node:assert/strict';

import { postDailySummary } from '../src/services/dailyPostService.js';

test('daily summary safely skips when no channel is configured', async () => {
  const result = await postDailySummary(null, { dailyPostTime: '08:00' }, {
    now: new Date('2026-10-10T08:00:00Z'),
    loadPredictions: async () => { throw new Error('must not load'); },
  });
  assert.equal(result.status, 'skipped-no-channel');
});

test('daily summary sends only after winning the database claim', async () => {
  let sends = 0;
  let completed = 0;
  const client = { channels: { fetch: async () => ({ isTextBased: () => true, send: async () => { sends += 1; } }) } };
  const card = {
    matchId: '10',
    match: { homeTeam: 'Home', awayTeam: 'Away', leagueName: 'League', kickoffAt: new Date('2026-10-10T14:00:00Z') },
    snapshot: {
      modelVersion: 'poisson-v1.1', missingInputs: [], dataCoverage: { leagueMatchSample: 30, homeMatchSample: 8, awayMatchSample: 8 },
      probabilities: { homeWin: 0.6, draw: 0.25, awayWin: 0.15, exactScorelines: [{ score: '1-0', probability: 0.2 }] },
    },
  };
  const options = {
    now: new Date('2026-10-10T08:00:00Z'),
    loadPredictions: async () => [card],
    claim: async () => ({ key: 'primary' }),
    complete: async () => { completed += 1; },
    release: async () => {},
  };

  const result = await postDailySummary(client, { dailyPostChannelId: '123', dailyPostTime: '08:00' }, options);
  assert.equal(result.status, 'posted');
  assert.equal(sends, 1);
  assert.equal(completed, 1);

  const duplicate = await postDailySummary(client, { dailyPostChannelId: '123', dailyPostTime: '08:00' }, {
    ...options, claim: async () => null,
  });
  assert.equal(duplicate.status, 'already-posted-or-claimed');
  assert.equal(sends, 1);
});

test('failed daily message releases its lease for a later retry', async () => {
  let released = 0;
  const client = { channels: { fetch: async () => ({ isTextBased: () => true, send: async () => { throw new Error('missing permission'); } }) } };
  const card = {
    matchId: '10', match: { homeTeam: 'H', awayTeam: 'A', leagueName: 'L', kickoffAt: new Date('2026-10-10T14:00:00Z') },
    snapshot: { probabilities: {}, dataCoverage: {}, missingInputs: [] },
  };
  await assert.rejects(() => postDailySummary(client, { dailyPostChannelId: '123', dailyPostTime: '08:00' }, {
    now: new Date('2026-10-10T08:00:00Z'), loadPredictions: async () => [card],
    claim: async () => ({}), complete: async () => {}, release: async () => { released += 1; },
  }), /missing permission/);
  assert.equal(released, 1);
});
