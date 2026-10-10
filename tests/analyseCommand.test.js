import test from 'node:test';
import assert from 'node:assert/strict';

import { createAnalyseCommand } from '../src/commands/analyse.js';
import { MatchAnalysisError } from '../src/services/matchAnalysisService.js';

function interactionFor(fixtureId = 9001) {
  const state = { deferred: null, reply: null };
  return {
    state,
    options: { getInteger: () => fixtureId },
    async deferReply(value) { state.deferred = value; },
    async editReply(value) { state.reply = value; },
  };
}

test('analyse command renders model probabilities, scorelines and data gaps', async () => {
  const interaction = interactionFor();
  const command = createAnalyseCommand({
    databaseStatus: () => ({ connected: true }),
    analyse: async () => ({
      modelVersion: 'poisson-v1.1',
      match: { fixtureId: '9001', homeTeam: 'Home FC', awayTeam: 'Away FC' },
      expectedGoals: { home: 1.6, away: 1.1 },
      markets: {
        homeWin: 0.48, draw: 0.27, awayWin: 0.25,
        totals: { over25: 0.51 }, bothTeamsToScore: { yes: 0.49 },
        exactScorelines: [
          { score: '1-1', probability: 0.12 }, { score: '1-0', probability: 0.11 },
          { score: '2-1', probability: 0.1 }, { score: '2-0', probability: 0.09 },
          { score: '0-1', probability: 0.08 }, { score: '0-0', probability: 0.07 },
        ],
      },
      dataCoverage: { missing: ['xG/xGA', 'confirmed lineups'], leagueMatchSample: 40 },
      limitations: ['Independent Poisson assumption.'],
    }),
  });

  await command.execute(interaction);

  assert.deepEqual(interaction.state.deferred, { ephemeral: true });
  const embed = interaction.state.reply.embeds[0].toJSON();
  assert.equal(embed.title, '📊 Home FC vs Away FC');
  assert.match(embed.fields.find((field) => field.name === 'Top scorelines').value, /1-1 — 12.0%/);
  assert.match(embed.fields.find((field) => field.name === 'Data gaps').value, /xG\/xGA/);
});

test('analyse command explains unavailable provider statistics safely', async () => {
  const interaction = interactionFor();
  const command = createAnalyseCommand({
    databaseStatus: () => ({ connected: true }),
    analyse: async () => { throw new MatchAnalysisError('internal provider text', 'INSUFFICIENT_DATA'); },
  });

  await command.execute(interaction);

  assert.match(interaction.state.reply, /does not provide enough current-season statistics/i);
  assert.doesNotMatch(interaction.state.reply, /internal provider text/);
});
