import test from 'node:test';
import assert from 'node:assert/strict';

import { selectBestMarkets, selectTeamWins } from '../src/services/predictionSelectionService.js';

function card(matchId, probabilities, coverage = {}) {
  return {
    matchId,
    match: { homeTeam: `Home ${matchId}`, awayTeam: `Away ${matchId}`, leagueName: 'League A' },
    snapshot: {
      modelVersion: 'poisson-v1.1', probabilities,
      dataCoverage: { leagueMatchSample: 30, homeMatchSample: 8, awayMatchSample: 8, ...coverage },
      missingInputs: ['xG/xGA'],
    },
  };
}

test('market selector returns one highest-qualified selection per match', () => {
  const cards = [card('1', {
    homeWin: 0.56, draw: 0.24, awayWin: 0.2,
    doubleChance: { homeDraw: 0.8, awayDraw: 0.44, homeAway: 0.76 },
    totals: { over15: 0.78, under15: 0.22, over25: 0.52, under25: 0.48 },
    bothTeamsToScore: { yes: 0.49, no: 0.51 },
  })];

  const selections = selectBestMarkets(cards);

  assert.equal(selections.length, 1);
  assert.equal(selections[0].matchId, '1');
  assert.equal(selections[0].market, 'Double Chance');
  assert.equal(selections[0].selection, 'Home or Draw');
  assert.equal(selections[0].probability, 0.8);
  assert.equal(selections[0].dataIncomplete, true);
});

test('market selector rejects predictions with inadequate samples', () => {
  const cards = [card('1', {
    homeWin: 0.8, draw: 0.1, awayWin: 0.1,
    doubleChance: { homeDraw: 0.9, awayDraw: 0.2, homeAway: 0.9 },
    totals: { over15: 0.9, under15: 0.1, over25: 0.8, under25: 0.2 },
    bothTeamsToScore: { yes: 0.7, no: 0.3 },
  }, { leagueMatchSample: 5 })];

  assert.deepEqual(selectBestMarkets(cards), []);
});

test('team-win selector supports either home or away wins without forcing a leg', () => {
  const cards = [
    card('1', { homeWin: 0.61, draw: 0.2, awayWin: 0.19 }),
    card('2', { homeWin: 0.2, draw: 0.19, awayWin: 0.61 }),
    card('3', { homeWin: 0.4, draw: 0.3, awayWin: 0.3 }),
  ];

  const selections = selectTeamWins(cards, { minProbability: 0.6 });

  assert.deepEqual(selections.map((item) => item.selection), ['Home 1 to win', 'Away 2 to win']);
});
