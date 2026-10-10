import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildExactScoreDistribution,
  calculateLeagueGoalAverages,
  calculateMarketsFromDistribution,
  estimateExpectedGoals,
  poissonProbability,
} from '../src/services/predictionEngine.js';

test('Poisson probability yields a valid single-event probability', () => {
  const probability = poissonProbability(1.5, 2);
  assert.ok(probability > 0 && probability < 1);
});

test('Score distribution normalizes to about 1.0', () => {
  const distribution = buildExactScoreDistribution(1.5, 1.1, 4);
  const total = Object.values(distribution).reduce((sum, value) => sum + value, 0);
  assert.ok(Math.abs(total - 1) < 1e-6, `Distribution total was ${total}`);
});

test('Outcome probabilities remain mutually consistent and sum to around 1.0', () => {
  const distribution = buildExactScoreDistribution(1.8, 1.2, 5);
  const markets = calculateMarketsFromDistribution(distribution);
  const total = markets.homeWin + markets.draw + markets.awayWin;
  assert.ok(Math.abs(total - 1) < 1e-5, `Outcome total was ${total}`);
  assert.ok(markets.homeWin > 0 && markets.draw > 0 && markets.awayWin > 0);
});

test('league scoring averages use completed fixtures only', () => {
  const fixtures = [
    { fixture: { status: { short: 'FT' } }, goals: { home: 2, away: 1 } },
    { fixture: { status: { short: 'AET' } }, goals: { home: 1, away: 1 } },
    { fixture: { status: { short: 'NS' } }, goals: { home: null, away: null } },
  ];

  assert.deepEqual(calculateLeagueGoalAverages(fixtures), {
    home: 1.5,
    away: 1,
    sampleSize: 2,
  });
});

test('expected goals blend home and away rates with league priors', () => {
  const homeStats = {
    form: '',
    fixtures: { played: { home: 5 } },
    goals: { for: { total: { home: 10 } }, against: { total: { home: 5 } } },
  };
  const awayStats = {
    form: '',
    fixtures: { played: { away: 5 } },
    goals: { for: { total: { away: 5 } }, against: { total: { away: 10 } } },
  };

  const result = estimateExpectedGoals({
    homeStats,
    awayStats,
    leagueAverages: { home: 1.5, away: 1.1, sampleSize: 100 },
    priorMatches: 5,
  });

  assert.equal(result.home, 1.75);
  assert.equal(result.away, 1.05);
  assert.equal(result.features.homeMatches, 5);
  assert.equal(result.features.awayMatches, 5);
});

test('recent form has a capped modest effect on expected goals', () => {
  const base = {
    fixtures: { played: { home: 10, away: 10 } },
    goals: {
      for: { total: { home: 15, away: 10 } },
      against: { total: { home: 10, away: 15 } },
    },
  };
  const strongHome = estimateExpectedGoals({
    homeStats: { ...base, form: 'WWWWW' },
    awayStats: { ...base, form: 'LLLLL' },
    leagueAverages: { home: 1.5, away: 1.1, sampleSize: 100 },
  });
  const neutral = estimateExpectedGoals({
    homeStats: { ...base, form: 'DDDDD' },
    awayStats: { ...base, form: 'DDDDD' },
    leagueAverages: { home: 1.5, away: 1.1, sampleSize: 100 },
  });

  assert.ok(strongHome.home > neutral.home);
  assert.ok(strongHome.away < neutral.away);
  assert.ok(strongHome.features.formAdjustment.home <= 1.08);
  assert.ok(strongHome.features.formAdjustment.away >= 0.92);
});

test('derived markets include consistent first-score and team-total probabilities', () => {
  const distribution = buildExactScoreDistribution(1.6, 1.1, 8);
  const markets = calculateMarketsFromDistribution(distribution, { homeLambda: 1.6, awayLambda: 1.1 });

  const firstScoreTotal = markets.firstTeamToScore.home + markets.firstTeamToScore.away + markets.firstTeamToScore.noGoal;
  assert.ok(Math.abs(firstScoreTotal - 1) < 1e-5);
  assert.ok(Math.abs(markets.teamTotals.home.over15 + markets.teamTotals.home.under15 - 1) < 1e-5);
  assert.ok(Math.abs(markets.teamTotals.away.over05 + markets.teamTotals.away.under05 - 1) < 1e-5);
  assert.equal(markets.exactScorelines.length, 6);
});
