import Match from '../models/Match.js';

function required(value, label) {
  if (value === undefined || value === null || value === '') {
    throw new TypeError(`Provider fixture is missing required fields: ${label}.`);
  }
  return value;
}

export function mapProviderFixture(source, now = new Date()) {
  const fixtureId = required(source?.fixture?.id, 'fixture.id');
  const kickoff = new Date(required(source?.fixture?.date, 'fixture.date'));
  if (Number.isNaN(kickoff.getTime())) {
    throw new TypeError('Provider fixture is missing required fields: valid fixture.date.');
  }
  return {
    fixtureId: String(fixtureId),
    provider: 'api-football',
    providerUpdatedAt: new Date(now),
    league: {
      id: String(required(source?.league?.id, 'league.id')),
      name: required(source?.league?.name, 'league.name'),
      country: source?.league?.country ?? null,
      season: source?.league?.season ?? null,
    },
    kickoffAt: kickoff,
    homeTeam: {
      id: String(required(source?.teams?.home?.id, 'teams.home.id')),
      name: required(source?.teams?.home?.name, 'teams.home.name'),
    },
    awayTeam: {
      id: String(required(source?.teams?.away?.id, 'teams.away.id')),
      name: required(source?.teams?.away?.name, 'teams.away.name'),
    },
    status: {
      short: source?.fixture?.status?.short ?? 'TBD',
      long: source?.fixture?.status?.long ?? 'Time To Be Defined',
    },
    score: { home: source?.goals?.home ?? null, away: source?.goals?.away ?? null },
  };
}

export async function syncFixtures(fixtures, { model = Match, now = new Date() } = {}) {
  if (!Array.isArray(fixtures)) throw new TypeError('Fixtures must be an array.');
  if (fixtures.length === 0) return { received: 0, persisted: 0, matched: 0, modified: 0, upserted: 0 };
  const operations = fixtures.map((fixture) => {
    const normalized = mapProviderFixture(fixture, now);
    return {
      updateOne: {
        filter: { fixtureId: normalized.fixtureId },
        update: { $set: normalized },
        upsert: true,
      },
    };
  });
  const result = await model.bulkWrite(operations, { ordered: false });
  return {
    received: fixtures.length,
    persisted: operations.length,
    matched: result.matchedCount ?? 0,
    modified: result.modifiedCount ?? 0,
    upserted: result.upsertedCount ?? 0,
  };
}
