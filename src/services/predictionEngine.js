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

export function calculateMarketsFromDistribution(scoreDistribution) {
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
    exactScorelines,
    normalized: true,
  };
}

export function generatePredictionSummary(homeTeam, awayTeam, homeLambda, awayLambda) {
  const scoreDistribution = buildExactScoreDistribution(homeLambda, awayLambda, EXACT_SCORE_MAX);
  const markets = calculateMarketsFromDistribution(scoreDistribution);

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
