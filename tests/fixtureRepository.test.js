import test from 'node:test';
import assert from 'node:assert/strict';

import { mapProviderFixture, syncFixtures } from '../src/services/fixtureRepository.js';

const providerFixture = {
  fixture: {
    id: 12345,
    date: '2026-10-12T18:00:00+02:00',
    status: { short: 'NS', long: 'Not Started' },
  },
  league: { id: 39, name: 'Premier League', country: 'England', season: 2026 },
  teams: {
    home: { id: 50, name: 'Manchester City' },
    away: { id: 42, name: 'Arsenal' },
  },
  goals: { home: null, away: null },
};

test('provider fixtures map to stable normalized match records', () => {
  assert.deepEqual(mapProviderFixture(providerFixture, new Date('2026-10-10T10:00:00Z')), {
    fixtureId: '12345',
    provider: 'api-football',
    providerUpdatedAt: new Date('2026-10-10T10:00:00Z'),
    league: { id: '39', name: 'Premier League', country: 'England', season: 2026 },
    kickoffAt: new Date('2026-10-12T16:00:00.000Z'),
    homeTeam: { id: '50', name: 'Manchester City' },
    awayTeam: { id: '42', name: 'Arsenal' },
    status: { short: 'NS', long: 'Not Started' },
    score: { home: null, away: null },
  });
});

test('malformed provider fixtures are rejected before database writes', () => {
  assert.throws(() => mapProviderFixture({ fixture: {}, teams: {} }), /missing required fields/i);
});

test('fixture synchronization performs idempotent upserts keyed by provider fixture ID', async () => {
  const writes = [];
  const model = {
    async bulkWrite(operations) {
      writes.push(...operations);
      return { matchedCount: 0, modifiedCount: 0, upsertedCount: operations.length };
    },
  };

  const result = await syncFixtures([providerFixture], { model, now: new Date('2026-10-10T10:00:00Z') });

  assert.deepEqual(result, { received: 1, persisted: 1, matched: 0, modified: 0, upserted: 1 });
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0].updateOne.filter, { fixtureId: '12345' });
  assert.equal(writes[0].updateOne.upsert, true);
});
