import test from 'node:test';
import assert from 'node:assert/strict';

import { runDailyAnalysis } from '../src/jobs/dailyAnalysis.js';

function fixture(id, hours = 2) {
  return {
    fixture: { id, date: new Date(Date.parse('2026-10-10T10:00:00Z') + hours * 3_600_000).toISOString(), status: { short: 'NS' } },
    teams: { home: { id: 1 }, away: { id: 2 } },
  };
}

test('analysis cycle persists fixtures and isolates individual analysis failures', async () => {
  const analysed = [];
  const result = await runDailyAnalysis({
    now: () => new Date('2026-10-10T10:00:00Z'),
    api: { getUpcomingFixtures: async () => [fixture(1), fixture(2, 3)] },
    getConfiguration: async () => ({ favouriteTeamIds: [] }),
    persistFixtures: async (fixtures) => ({ persisted: fixtures.length }),
    loadSnapshots: async () => [],
    analyse: async (id) => {
      analysed.push(id);
      if (id === 1) throw new Error('provider plan blocked');
      return { match: { fixtureId: String(id) } };
    },
    postSummary: async () => ({ status: 'not-due' }),
  });

  assert.deepEqual(analysed, [1, 2]);
  assert.equal(result.fixtureCount, 2);
  assert.equal(result.analysed, 1);
  assert.equal(result.failed, 1);
  assert.equal(result.post.status, 'not-due');
});

test('overlapping scheduler cycles are coalesced', async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const dependencies = {
    now: () => new Date('2026-10-10T10:00:00Z'),
    api: { getUpcomingFixtures: async () => { await gate; return []; } },
    getConfiguration: async () => ({ favouriteTeamIds: [] }),
    persistFixtures: async () => ({ persisted: 0 }),
    loadSnapshots: async () => [],
    analyse: async () => {},
    postSummary: async () => ({ status: 'not-due' }),
  };

  const first = runDailyAnalysis(dependencies);
  const second = await runDailyAnalysis(dependencies);
  assert.equal(second.status, 'already-running');
  release();
  await first;
});

