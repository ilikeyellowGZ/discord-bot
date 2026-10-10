import test from 'node:test';
import assert from 'node:assert/strict';

import { FootballApiError } from '../src/services/footballApiService.js';
import { createFixturesCommand } from '../src/commands/fixtures.js';

const fixture = {
  fixture: { id: 123, date: '2026-10-12T18:00:00+02:00', status: { short: 'NS', long: 'Not Started' } },
  league: { id: 39, name: 'Premier League', country: 'England', season: 2026 },
  teams: { home: { id: 50, name: 'Manchester City' }, away: { id: 42, name: 'Arsenal' } },
  goals: { home: null, away: null },
};

function interactionFor(limit = 5) {
  const state = { deferred: null, reply: null };
  return {
    state,
    options: { getInteger: () => limit },
    async deferReply(options) { state.deferred = options; },
    async editReply(payload) { state.reply = payload; },
  };
}

test('fixtures command displays provider data and persists it when MongoDB is connected', async () => {
  const interaction = interactionFor(5);
  let persisted = 0;
  const command = createFixturesCommand({
    service: { async getUpcomingFixtures() { return [fixture]; } },
    databaseStatus: () => ({ connected: true }),
    persist: async (fixtures) => { persisted = fixtures.length; },
  });

  await command.execute(interaction);

  assert.deepEqual(interaction.state.deferred, { ephemeral: true });
  assert.equal(persisted, 1);
  const response = interaction.state.reply.embeds[0].toJSON();
  assert.equal(response.fields[0].name, 'Manchester City vs Arsenal');
  assert.match(response.fields[0].value, /Premier League/);
});

test('fixtures command returns a safe useful message when the provider is unavailable', async () => {
  const interaction = interactionFor(5);
  const command = createFixturesCommand({
    service: { async getUpcomingFixtures() { throw new FootballApiError('internal detail', { code: 'RATE_LIMITED' }); } },
    databaseStatus: () => ({ connected: false }),
    persist: async () => { throw new Error('must not persist'); },
  });

  await command.execute(interaction);

  assert.equal(interaction.state.reply, 'The football data provider rate limit has been reached. Please try again later.');
  assert.doesNotMatch(interaction.state.reply, /internal detail/);
});
