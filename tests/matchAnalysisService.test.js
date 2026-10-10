import test from 'node:test';
import assert from 'node:assert/strict';

import { analyseFixture, MatchAnalysisError } from '../src/services/matchAnalysisService.js';

const fixture = {
  fixture: { id: 9001, date: '2026-10-12T18:00:00+02:00', status: { short: 'NS', long: 'Not Started' } },
  league: { id: 39, name: 'Premier League', country: 'England', season: 2026 },
  teams: { home: { id: 50, name: 'Manchester City' }, away: { id: 42, name: 'Arsenal' } },
  goals: { home: null, away: null },
};

const homeStats = {
  form: 'WDWWW', fixtures: { played: { home: 5, total: 10 } },
  goals: { for: { total: { home: 10 } }, against: { total: { home: 5 } } },
};
const awayStats = {
  form: 'DWLWW', fixtures: { played: { away: 5, total: 10 } },
  goals: { for: { total: { away: 6 } }, against: { total: { away: 8 } } },
};
const completed = [
  { fixture: { status: { short: 'FT' } }, goals: { home: 2, away: 1 } },
  { fixture: { status: { short: 'FT' } }, goals: { home: 1, away: 1 } },
];

test('analysis uses provider statistics and records immutable prediction metadata', async () => {
  const snapshots = [];
  const latest = [];
  const api = {
    async getMatchById() { return fixture; },
    async getTeamStatistics({ teamId }) { return teamId === 50 ? homeStats : awayStats; },
    async getCompletedLeagueFixtures() { return completed; },
  };
  const result = await analyseFixture(9001, {
    api,
    now: () => new Date('2026-10-10T10:00:00Z'),
    snapshotModel: { async create(document) { snapshots.push(document); return document; } },
    analysisModel: { async updateOne(filter, update) { latest.push({ filter, update }); } },
  });

  assert.equal(result.match.fixtureId, '9001');
  assert.equal(result.modelVersion, 'poisson-v1.1');
  assert.equal(result.markets.exactScorelines.length, 6);
  assert.ok(Math.abs(result.markets.homeWin + result.markets.draw + result.markets.awayWin - 1) < 1e-5);
  assert.deepEqual(result.dataCoverage.available, ['home/away goals', 'league scoring averages', 'recent form']);
  assert.ok(result.dataCoverage.missing.includes('xG/xGA'));
  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].matchId, '9001');
  assert.equal(snapshots[0].homeTeamId, '50');
  assert.equal(latest[0].filter.matchId, '9001');
});

test('analysis rejects fixtures that have already started', async () => {
  const startedFixture = {
    ...fixture,
    fixture: { ...fixture.fixture, date: '2026-10-09T18:00:00+02:00', status: { short: 'FT' } },
  };

  await assert.rejects(
    () => analyseFixture(9001, {
      api: { async getMatchById() { return startedFixture; } },
      now: () => new Date('2026-10-10T10:00:00Z'),
    }),
    (error) => error instanceof MatchAnalysisError && error.code === 'NOT_UPCOMING'
  );
});
