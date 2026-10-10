import test from 'node:test';
import assert from 'node:assert/strict';

import { FootballApiError, FootballApiService } from '../src/services/footballApiService.js';

function apiResponse(body, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

test('upcoming fixtures use the free-plan-compatible date and timezone parameters', async () => {
  let requestedUrl;
  let requestedHeaders;
  const service = new FootballApiService({
    apiKey: 'private-key',
    timeZone: 'Africa/Johannesburg',
    now: () => Date.parse('2026-10-10T10:00:00Z'),
    fetchImpl: async (url, options) => {
      requestedUrl = new URL(url);
      requestedHeaders = options.headers;
      return apiResponse({ errors: [], response: [{ fixture: { id: 42, date: '2026-10-10T12:00:00Z', status: { short: 'NS' } } }] });
    },
  });

  const fixtures = await service.getUpcomingFixtures(1);

  assert.equal(requestedUrl.origin, 'https://v3.football.api-sports.io');
  assert.equal(requestedUrl.pathname, '/fixtures');
  assert.equal(requestedUrl.searchParams.get('date'), '2026-10-10');
  assert.equal(requestedUrl.searchParams.get('timezone'), 'Africa/Johannesburg');
  assert.equal(requestedUrl.searchParams.has('live'), false);
  assert.equal(requestedHeaders['x-apisports-key'], 'private-key');
  assert.deepEqual(fixtures, [{ fixture: { id: 42, date: '2026-10-10T12:00:00Z', status: { short: 'NS' } } }]);
});

test('identical requests are served from cache within the TTL', async () => {
  let calls = 0;
  const service = new FootballApiService({
    apiKey: 'key',
    cacheTtlMs: 60_000,
    now: () => Date.parse('2026-10-10T10:00:00Z'),
    fetchImpl: async () => {
      calls += 1;
      return apiResponse({ errors: [], response: [{ fixture: { id: calls, date: '2026-10-10T12:00:00Z', status: { short: 'NS' } } }] });
    },
  });

  const first = await service.getUpcomingFixtures(1);
  const second = await service.getUpcomingFixtures(1);

  assert.equal(calls, 1);
  assert.deepEqual(second, first);
});

test('concurrent identical requests share one provider call', async () => {
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const service = new FootballApiService({
    apiKey: 'key',
    now: () => Date.parse('2026-10-10T10:00:00Z'),
    fetchImpl: async () => {
      calls += 1;
      await gate;
      return apiResponse({ errors: [], response: [{ fixture: { id: 7, date: '2026-10-10T12:00:00Z', status: { short: 'NS' } } }] });
    },
  });

  const first = service.getUpcomingFixtures(1);
  const second = service.getUpcomingFixtures(1);
  release();

  assert.deepEqual(await Promise.all([first, second]), [
    [{ fixture: { id: 7, date: '2026-10-10T12:00:00Z', status: { short: 'NS' } } }],
    [{ fixture: { id: 7, date: '2026-10-10T12:00:00Z', status: { short: 'NS' } } }],
  ]);
  assert.equal(calls, 1);
});

test('upcoming fixtures exclude past and cancelled matches, then sort and limit results', async () => {
  const service = new FootballApiService({
    apiKey: 'key',
    now: () => Date.parse('2026-10-10T10:00:00Z'),
    fetchImpl: async () => apiResponse({ errors: [], response: [
      { fixture: { id: 1, date: '2026-10-10T09:00:00Z', status: { short: 'NS' } } },
      { fixture: { id: 2, date: '2026-10-10T14:00:00Z', status: { short: 'NS' } } },
      { fixture: { id: 3, date: '2026-10-10T12:00:00Z', status: { short: 'NS' } } },
      { fixture: { id: 4, date: '2026-10-10T11:00:00Z', status: { short: 'CANC' } } },
    ] }),
  });

  const fixtures = await service.getUpcomingFixtures(1);

  assert.deepEqual(fixtures.map((item) => item.fixture.id), [3]);
});

test('upcoming fixtures scan the next date when today has too few matches', async () => {
  const requestedDates = [];
  const service = new FootballApiService({
    apiKey: 'key',
    now: () => Date.parse('2026-10-10T18:00:00Z'),
    fetchImpl: async (url) => {
      const date = new URL(url).searchParams.get('date');
      requestedDates.push(date);
      const response = date === '2026-10-11'
        ? [{ fixture: { id: 9, date: '2026-10-11T08:00:00Z', status: { short: 'NS' } } }]
        : [];
      return apiResponse({ errors: [], response });
    },
  });

  const fixtures = await service.getUpcomingFixtures(1);

  assert.deepEqual(requestedDates, ['2026-10-10', '2026-10-11']);
  assert.deepEqual(fixtures.map((item) => item.fixture.id), [9]);
});

test('favourite-team fixtures are retained beyond the normal display limit', async () => {
  const service = new FootballApiService({
    apiKey: 'key',
    now: () => Date.parse('2026-10-10T10:00:00Z'),
    fetchImpl: async (url) => {
      const date = new URL(url).searchParams.get('date');
      const response = date === '2026-10-11'
        ? [{ fixture: { id: 99, date: '2026-10-11T12:00:00Z', status: { short: 'NS' } }, teams: { home: { id: 500 }, away: { id: 2 } } }]
        : [
          { fixture: { id: 1, date: '2026-10-10T11:00:00Z', status: { short: 'NS' } }, teams: { home: { id: 1 }, away: { id: 2 } } },
          { fixture: { id: 2, date: '2026-10-10T12:00:00Z', status: { short: 'NS' } }, teams: { home: { id: 3 }, away: { id: 4 } } },
        ];
      return apiResponse({ errors: [], response });
    },
  });

  const fixtures = await service.getUpcomingFixtures(1, { favouriteTeamIds: ['500'] });

  assert.deepEqual(fixtures.map((item) => item.fixture.id), [1, 99]);
});

test('transient server failures retry with a bounded attempt count', async () => {
  let calls = 0;
  const waits = [];
  const service = new FootballApiService({
    apiKey: 'key',
    maxRetries: 2,
    sleep: async (milliseconds) => waits.push(milliseconds),
    fetchImpl: async () => {
      calls += 1;
      if (calls < 3) return apiResponse({ message: 'temporary' }, { status: 500 });
      return apiResponse({ errors: [], response: [{ fixture: { id: 8, date: '2099-01-01T12:00:00Z', status: { short: 'NS' } } }] });
    },
  });

  assert.deepEqual((await service.getUpcomingFixtures(1)).map((item) => item.fixture.id), [8]);
  assert.equal(calls, 3);
  assert.deepEqual(waits, [250, 500]);
});

test('provider errors fail honestly and never return invented fixtures', async () => {
  const service = new FootballApiService({
    apiKey: 'key',
    fetchImpl: async () => apiResponse({ errors: { token: 'Invalid key' }, response: [] }),
  });

  await assert.rejects(
    () => service.getUpcomingFixtures(5),
    (error) => error instanceof FootballApiError && error.code === 'PROVIDER_ERROR'
  );
});

test('fixture limits outside the provider and Discord display bounds are rejected', async () => {
  const service = new FootballApiService({ apiKey: 'key', fetchImpl: async () => { throw new Error('must not run'); } });

  await assert.rejects(() => service.getUpcomingFixtures(0), /between 1 and 20/);
  await assert.rejects(() => service.getUpcomingFixtures(21), /between 1 and 20/);
  await assert.rejects(() => service.getUpcomingFixtures('5'), /between 1 and 20/);
});

test('a missing API key produces a configuration error without fallback data', async () => {
  const service = new FootballApiService({ apiKey: '' });

  await assert.rejects(
    () => service.getUpcomingFixtures(5),
    (error) => error instanceof FootballApiError && error.code === 'NOT_CONFIGURED'
  );
});

test('team statistics return the provider object using required identifiers', async () => {
  let requestedUrl;
  const providerStats = { team: { id: 50 }, fixtures: { played: { total: 8 } } };
  const service = new FootballApiService({
    apiKey: 'key',
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return apiResponse({ errors: [], response: providerStats });
    },
  });

  const result = await service.getTeamStatistics({ leagueId: 39, season: 2026, teamId: 50, asOf: '2026-10-10' });

  assert.equal(requestedUrl.pathname, '/teams/statistics');
  assert.deepEqual(Object.fromEntries(requestedUrl.searchParams), {
    league: '39', season: '2026', team: '50', date: '2026-10-10',
  });
  assert.deepEqual(result, providerStats);
});

test('completed league fixtures use league, season, status and cutoff filters', async () => {
  let requestedUrl;
  const service = new FootballApiService({
    apiKey: 'key',
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return apiResponse({ errors: [], response: [] });
    },
  });

  await service.getCompletedLeagueFixtures({ leagueId: 39, season: 2026, asOf: '2026-10-10' });

  assert.equal(requestedUrl.pathname, '/fixtures');
  assert.deepEqual(Object.fromEntries(requestedUrl.searchParams), {
    league: '39', season: '2026', status: 'FT-AET-PEN', to: '2026-10-10', timezone: 'Africa/Johannesburg',
  });
});
