const EXACT_SCORE_MAX = 7;

export function poissonProbability(lambda, k) {
  if (lambda < 0 || !Number.isFinite(lambda)) {
    throw new Error('Poisson lambda must be a finite number greater than or equal to zero.');
  }

  if (!Number.isInteger(k) || k < 0) {
    throw new Error('Poisson input k must be a non-negative integer.');
  }

  const e = Math.exp(-lambda);
  const power = Math.pow(lambda, k);
  const factorial = k === 0 ? 1 : Array.from({ length: k }, (_, index) => index + 1).reduce((product, value) => product * value, 1);
  return e * power / factorial;
}

export function normalizeDistribution(scoreDistribution) {
  const total = Object.values(scoreDistribution).reduce((sum, value) => sum + value, 0);

  if (total <= 0 || !Number.isFinite(total)) {
    return Object.fromEntries(Object.entries(scoreDistribution).map(([key, value]) => [key, value || 0]));
  }

  return Object.fromEntries(
    Object.entries(scoreDistribution).map(([key, value]) => [key, Number((value / total).toFixed(12))])
  );
}

export function buildExactScoreDistribution(homeLambda, awayLambda, maxGoals = EXACT_SCORE_MAX) {
  const distribution = {};

  for (let homeGoals = 0; homeGoals <= maxGoals; homeGoals += 1) {
    for (let awayGoals = 0; awayGoals <= maxGoals; awayGoals += 1) {
      const score = `${homeGoals}-${awayGoals}`;
      const probability = poissonProbability(homeLambda, homeGoals) * poissonProbability(awayLambda, awayGoals);
      distribution[score] = probability;
    }
  }

  return normalizeDistribution(distribution);
}

export function calculateLeagueGoalAverages(fixtures, fallback = { home: 1.45, away: 1.15 }) {
  const completed = fixtures.filter((fixture) => {
    const status = fixture?.fixture?.status?.short;
    return ['FT', 'AET', 'PEN'].includes(status)
      && Number.isFinite(fixture?.goals?.home)
      && Number.isFinite(fixture?.goals?.away);
  });
  if (completed.length === 0) return { ...fallback, sampleSize: 0 };
  const totals = completed.reduce((sum, fixture) => ({
    home: sum.home + fixture.goals.home,
    away: sum.away + fixture.goals.away,
  }), { home: 0, away: 0 });
  return {
    home: Number((totals.home / completed.length).toFixed(4)),
    away: Number((totals.away / completed.length).toFixed(4)),
    sampleSize: completed.length,
  };
}

function nestedNumber(source, path) {
  const value = path.reduce((current, key) => current?.[key], source);
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function recentFormFactor(form = '') {
  const recent = String(form).toUpperCase().replace(/[^WDL]/g, '').slice(-5);
  if (recent.length === 0) return 1;
  let weightedPoints = 0;
  let weightTotal = 0;
  for (let index = 0; index < recent.length; index += 1) {
    const weight = index + 1;
    weightedPoints += ({ W: 3, D: 1, L: 0 }[recent[index]] ?? 0) * weight;
    weightTotal += weight;
  }
  const pointsPerGame = weightedPoints / weightTotal;
  return Math.min(1.08, Math.max(0.92, 1 + ((pointsPerGame - 1.5) / 1.5) * 0.08));
}

function smoothedRate(total, matches, priorAverage, priorMatches) {
  return (total + priorMatches * priorAverage) / (matches + priorMatches);
}

export function estimateExpectedGoals({ homeStats, awayStats, leagueAverages, priorMatches = 5 }) {
  if (!homeStats || !awayStats || !leagueAverages) {
    throw new TypeError('Home statistics, away statistics and league averages are required.');
  }
  const homeMatches = nestedNumber(homeStats, ['fixtures', 'played', 'home']);
  const awayMatches = nestedNumber(awayStats, ['fixtures', 'played', 'away']);
  const leagueHome = Number(leagueAverages.home);
  const leagueAway = Number(leagueAverages.away);
  if (!(leagueHome > 0) || !(leagueAway > 0) || !(priorMatches > 0)) {
    throw new TypeError('League averages and prior match weight must be positive.');
  }

  const homeScored = smoothedRate(nestedNumber(homeStats, ['goals', 'for', 'total', 'home']), homeMatches, leagueHome, priorMatches);
  const awayConceded = smoothedRate(nestedNumber(awayStats, ['goals', 'against', 'total', 'away']), awayMatches, leagueHome, priorMatches);
  const awayScored = smoothedRate(nestedNumber(awayStats, ['goals', 'for', 'total', 'away']), awayMatches, leagueAway, priorMatches);
  const homeConceded = smoothedRate(nestedNumber(homeStats, ['goals', 'against', 'total', 'home']), homeMatches, leagueAway, priorMatches);
  const homeForm = recentFormFactor(homeStats.form);
  const awayForm = recentFormFactor(awayStats.form);
  const clamp = (value) => Math.min(4, Math.max(0.2, value));

  return {
    home: Number(clamp(((homeScored + awayConceded) / 2) * Math.sqrt(homeForm / awayForm)).toFixed(4)),
    away: Number(clamp(((awayScored + homeConceded) / 2) * Math.sqrt(awayForm / homeForm)).toFixed(4)),
    features: {
      homeMatches,
      awayMatches,
      priorMatches,
      leagueAverages,
      formAdjustment: { home: Number(homeForm.toFixed(4)), away: Number(awayForm.toFixed(4)) },
    },
  };
}

export function calculateMarketsFromDistribution(scoreDistribution, expectedGoals = {}) {
  const entries = Object.entries(scoreDistribution).map(([score, probability]) => {
    const [homeGoals, awayGoals] = score.split('-').map(Number);
    return { score, homeGoals, awayGoals, probability };
  });

  const homeWin = entries
    .filter(({ homeGoals, awayGoals }) => homeGoals > awayGoals)
    .reduce((sum, entry) => sum + entry.probability, 0);

  const draw = entries
    .filter(({ homeGoals, awayGoals }) => homeGoals === awayGoals)
    .reduce((sum, entry) => sum + entry.probability, 0);

  const awayWin = entries
    .filter(({ homeGoals, awayGoals }) => homeGoals < awayGoals)
    .reduce((sum, entry) => sum + entry.probability, 0);

  const over15 = entries
    .filter(({ homeGoals, awayGoals }) => homeGoals + awayGoals > 1)
    .reduce((sum, entry) => sum + entry.probability, 0);

  const over25 = entries
    .filter(({ homeGoals, awayGoals }) => homeGoals + awayGoals > 2)
    .reduce((sum, entry) => sum + entry.probability, 0);

  const over35 = entries
    .filter(({ homeGoals, awayGoals }) => homeGoals + awayGoals > 3)
    .reduce((sum, entry) => sum + entry.probability, 0);

  const bttsYes = entries
    .filter(({ homeGoals, awayGoals }) => homeGoals > 0 && awayGoals > 0)
    .reduce((sum, entry) => sum + entry.probability, 0);

  const bttsNo = 1 - bttsYes;
  const doubleChanceHomeDraw = homeWin + draw;
  const doubleChanceAwayDraw = awayWin + draw;
  const doubleChanceHomeAway = homeWin + awayWin;

  const exactScorelines = entries
    .sort((left, right) => right.probability - left.probability)
    .slice(0, 6)
    .map(({ score, probability }) => ({ score, probability }));

  const teamProbability = (team, threshold) => entries
    .filter((entry) => entry[team] > threshold)
    .reduce((sum, entry) => sum + entry.probability, 0);
  const homeOver05 = teamProbability('homeGoals', 0);
  const homeOver15 = teamProbability('homeGoals', 1);
  const homeOver25 = teamProbability('homeGoals', 2);
  const awayOver05 = teamProbability('awayGoals', 0);
  const awayOver15 = teamProbability('awayGoals', 1);
  const awayOver25 = teamProbability('awayGoals', 2);
  const noGoal = scoreDistribution['0-0'] ?? 0;
  const homeLambda = expectedGoals.homeLambda ?? entries.reduce((sum, entry) => sum + entry.homeGoals * entry.probability, 0);
  const awayLambda = expectedGoals.awayLambda ?? entries.reduce((sum, entry) => sum + entry.awayGoals * entry.probability, 0);
  const lambdaTotal = homeLambda + awayLambda;
  const homeFirst = lambdaTotal > 0 ? (homeLambda / lambdaTotal) * (1 - noGoal) : 0;
  const awayFirst = lambdaTotal > 0 ? (awayLambda / lambdaTotal) * (1 - noGoal) : 0;

  return {
    homeWin: Number(homeWin.toFixed(6)),
    draw: Number(draw.toFixed(6)),
    awayWin: Number(awayWin.toFixed(6)),
    doubleChance: {
      homeDraw: Number(doubleChanceHomeDraw.toFixed(6)),
      awayDraw: Number(doubleChanceAwayDraw.toFixed(6)),
      homeAway: Number(doubleChanceHomeAway.toFixed(6)),
    },
    totals: {
      over15: Number(over15.toFixed(6)),
      under15: Number((1 - over15).toFixed(6)),
      over25: Number(over25.toFixed(6)),
      under25: Number((1 - over25).toFixed(6)),
      over35: Number(over35.toFixed(6)),
      under35: Number((1 - over35).toFixed(6)),
    },
    bothTeamsToScore: {
      yes: Number(bttsYes.toFixed(6)),
      no: Number(bttsNo.toFixed(6)),
    },
    teamTotals: {
      home: {
        over05: Number(homeOver05.toFixed(6)), under05: Number((1 - homeOver05).toFixed(6)),
        over15: Number(homeOver15.toFixed(6)), under15: Number((1 - homeOver15).toFixed(6)),
        over25: Number(homeOver25.toFixed(6)), under25: Number((1 - homeOver25).toFixed(6)),
      },
      away: {
        over05: Number(awayOver05.toFixed(6)), under05: Number((1 - awayOver05).toFixed(6)),
        over15: Number(awayOver15.toFixed(6)), under15: Number((1 - awayOver15).toFixed(6)),
        over25: Number(awayOver25.toFixed(6)), under25: Number((1 - awayOver25).toFixed(6)),
      },
    },
    firstTeamToScore: {
      home: Number(homeFirst.toFixed(6)),
      away: Number(awayFirst.toFixed(6)),
      noGoal: Number(noGoal.toFixed(6)),
    },
    exactScorelines,
    normalized: true,
  };
}

export function generatePredictionSummary(homeTeam, awayTeam, homeLambda, awayLambda) {
  const scoreDistribution = buildExactScoreDistribution(homeLambda, awayLambda, EXACT_SCORE_MAX);
  const markets = calculateMarketsFromDistribution(scoreDistribution, { homeLambda, awayLambda });

  return {
    modelVersion: 'poisson-v1.0',
    modelTimestamp: new Date().toISOString(),
    teams: {
      home: homeTeam,
      away: awayTeam,
    },
    distribution: scoreDistribution,
    markets,
    summary: {
      highestProbabilityScore: markets.exactScorelines[0],
      projectedGoals: {
        home: Number(homeLambda.toFixed(2)),
        away: Number(awayLambda.toFixed(2)),
      },
    },
  };
}
