import test from 'node:test';
import assert from 'node:assert/strict';

import { createPredictionsCommand } from '../src/commands/predictions.js';
import { createBetsCommand } from '../src/commands/bets.js';
import { createAccumulatorCommand } from '../src/commands/accumulator.js';

function interaction() {
  const state = { deferred: null, reply: null };
  return {
    state,
    options: { getSubcommand: () => 'today' },
    async deferReply(value) { state.deferred = value; },
    async editReply(value) { state.reply = value; },
  };
}

function card(id, homeWin, awayWin) {
  return {
    matchId: id,
    match: { homeTeam: `Home ${id}`, awayTeam: `Away ${id}`, leagueName: 'League A', kickoffAt: new Date('2026-10-10T18:00:00Z') },
    snapshot: {
      modelVersion: 'poisson-v1.1',
      probabilities: {
        homeWin, draw: 0.2, awayWin,
        doubleChance: { homeDraw: homeWin + 0.2, awayDraw: awayWin + 0.2, homeAway: homeWin + awayWin },
        totals: { over15: 0.76, under15: 0.24, over25: 0.61, under25: 0.39 },
        bothTeamsToScore: { yes: 0.55, no: 0.45 },
        exactScorelines: [{ score: '1-0', probability: 0.14 }],
      },
      dataCoverage: { leagueMatchSample: 30, homeMatchSample: 8, awayMatchSample: 8 },
      missingInputs: ['xG/xGA'],
    },
  };
}

test('predictions command renders saved snapshot probabilities', async () => {
  const target = interaction();
  await createPredictionsCommand({ databaseStatus: () => ({ connected: true }), load: async () => [card('1', 0.6, 0.2)] }).execute(target);

  const embed = target.state.reply.embeds[0].toJSON();
  assert.equal(embed.title, '📈 Today’s model predictions');
  assert.match(embed.fields[0].value, /Home 60.0%/);
  assert.match(embed.fields[0].value, /Model: poisson-v1.1/);
});

test('bets today renders only qualified saved-snapshot selections', async () => {
  const target = interaction();
  await createBetsCommand({ databaseStatus: () => ({ connected: true }), load: async () => [card('1', 0.6, 0.2)] }).execute(target);

  const embed = target.state.reply.embeds[0].toJSON();
  assert.equal(embed.title, '💡 Qualified selections today');
  assert.equal(embed.fields.length, 1);
  assert.match(embed.fields[0].value, /Model probability:/);
});

test('accumulator command renders conservative and team-win variants', async () => {
  const target = interaction();
  await createAccumulatorCommand({
    databaseStatus: () => ({ connected: true }),
    load: async () => [card('1', 0.61, 0.19), card('2', 0.18, 0.62)],
  }).execute(target);

  const embed = target.state.reply.embeds[0].toJSON();
  assert.equal(embed.title, '🧮 Probability-based accumulators');
  assert.ok(embed.fields.some((field) => field.name === 'Conservative multi-market'));
  assert.ok(embed.fields.some((field) => field.name === 'Team-win accumulator'));
  assert.match(embed.description, /Adding legs reduces/);
});

test('Stage 4 commands return an honest empty state without sample predictions', async () => {
  for (const command of [
    createPredictionsCommand({ databaseStatus: () => ({ connected: true }), load: async () => [] }),
    createBetsCommand({ databaseStatus: () => ({ connected: true }), load: async () => [] }),
    createAccumulatorCommand({ databaseStatus: () => ({ connected: true }), load: async () => [] }),
  ]) {
    const target = interaction();
    await command.execute(target);
    assert.match(target.state.reply, /no saved pre-match predictions/i);
  }
});

test('Stage 4 commands fail fast when snapshot storage is unavailable', async () => {
  const target = interaction();
  const command = createPredictionsCommand({
    databaseStatus: () => ({ connected: false }),
    load: async () => { throw new Error('must not query'); },
  });

  await command.execute(target);

  assert.match(target.state.reply, /database is unavailable/i);
});
