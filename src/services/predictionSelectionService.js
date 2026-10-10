const DEFAULT_SAMPLE_REQUIREMENTS = { league: 20, team: 5 };

function hasSufficientData(card, requirements) {
  const coverage = card.snapshot?.dataCoverage ?? {};
  return coverage.leagueMatchSample >= requirements.league
    && coverage.homeMatchSample >= requirements.team
    && coverage.awayMatchSample >= requirements.team;
}

function baseSelection(card, candidate) {
  const missing = card.snapshot.missingInputs ?? [];
  return {
    matchId: card.matchId,
    match: `${card.match.homeTeam} vs ${card.match.awayTeam}`,
    league: card.match.leagueName,
    market: candidate.market,
    selection: candidate.selection,
    probability: Number(candidate.probability.toFixed(6)),
    reason: `${candidate.selection} is the highest qualified ${card.snapshot.modelVersion} market for this match.`,
    keyRisks: missing.length > 0 ? [`Missing inputs: ${missing.join(', ')}`] : ['Model uncertainty and match variance.'],
    externalSourceSupport: false,
    dataIncomplete: missing.length > 0,
    modelVersion: card.snapshot.modelVersion,
  };
}

export function selectBestMarkets(cards, {
  sampleRequirements = DEFAULT_SAMPLE_REQUIREMENTS,
} = {}) {
  return cards.flatMap((card) => {
    if (!hasSufficientData(card, sampleRequirements)) return [];
    const p = card.snapshot.probabilities ?? {};
    const candidates = [
      { market: 'Double Chance', selection: 'Home or Draw', probability: p.doubleChance?.homeDraw, minimum: 0.68 },
      { market: 'Double Chance', selection: 'Away or Draw', probability: p.doubleChance?.awayDraw, minimum: 0.68 },
      { market: 'Double Chance', selection: 'Home or Away', probability: p.doubleChance?.homeAway, minimum: 0.68 },
      { market: 'Total Goals', selection: 'Over 1.5', probability: p.totals?.over15, minimum: 0.72 },
      { market: 'Total Goals', selection: 'Under 1.5', probability: p.totals?.under15, minimum: 0.72 },
      { market: 'Total Goals', selection: 'Over 2.5', probability: p.totals?.over25, minimum: 0.6 },
      { market: 'Total Goals', selection: 'Under 2.5', probability: p.totals?.under25, minimum: 0.6 },
      { market: 'BTTS', selection: 'Yes', probability: p.bothTeamsToScore?.yes, minimum: 0.6 },
      { market: 'BTTS', selection: 'No', probability: p.bothTeamsToScore?.no, minimum: 0.6 },
      { market: 'Match Result', selection: `${card.match.homeTeam} to win`, probability: p.homeWin, minimum: 0.55 },
      { market: 'Match Result', selection: `${card.match.awayTeam} to win`, probability: p.awayWin, minimum: 0.55 },
    ].filter((candidate) => Number.isFinite(candidate.probability) && candidate.probability >= candidate.minimum)
      .sort((left, right) => right.probability - left.probability);
    return candidates.length > 0 ? [baseSelection(card, candidates[0])] : [];
  }).sort((left, right) => right.probability - left.probability);
}

export function selectTeamWins(cards, {
  minProbability = 0.55,
  sampleRequirements = DEFAULT_SAMPLE_REQUIREMENTS,
} = {}) {
  return cards.flatMap((card) => {
    if (!hasSufficientData(card, sampleRequirements)) return [];
    const home = card.snapshot.probabilities?.homeWin;
    const away = card.snapshot.probabilities?.awayWin;
    const candidate = home >= away
      ? { market: 'Team Win', selection: `${card.match.homeTeam} to win`, probability: home }
      : { market: 'Team Win', selection: `${card.match.awayTeam} to win`, probability: away };
    return Number.isFinite(candidate.probability) && candidate.probability >= minProbability
      ? [baseSelection(card, candidate)] : [];
  }).sort((left, right) => right.probability - left.probability);
}
