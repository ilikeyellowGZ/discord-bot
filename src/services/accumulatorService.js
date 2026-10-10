export function buildAccumulatorSelections(predictions, options = {}) {
  const maxLegs = Math.min(7, options.maxLegs ?? 7);
  const minProbability = options.minProbability ?? 0.45;

  const seenMatches = new Set();
  const selected = predictions
    .filter((prediction) => prediction.probability >= minProbability)
    .sort((left, right) => right.probability - left.probability)
    .filter((prediction) => {
      const key = String(prediction.matchId ?? prediction.match);
      if (seenMatches.has(key)) return false;
      seenMatches.add(key);
      return true;
    })
    .slice(0, maxLegs)
    .map((prediction) => ({
      matchId: prediction.matchId,
      match: prediction.match,
      market: prediction.market,
      selection: prediction.selection,
      probability: Number(prediction.probability.toFixed(4)),
      reason: prediction.reason || 'Model supports this selection with a stable probability estimate.',
      keyRisks: prediction.keyRisks || ['Data coverage varies by fixture.'],
      externalSourceSupport: prediction.externalSourceSupport || false,
      dataIncomplete: Boolean(prediction.dataIncomplete),
    }));

  const combinedProbability = selected.length > 0
    ? selected.reduce((total, leg) => total * leg.probability, 1)
    : 0;
  const weakestLeg = selected.length > 0
    ? selected.reduce((weakest, leg) => leg.probability < weakest.probability ? leg : weakest)
    : null;

  return {
    legs: selected,
    combinedProbability: Number(combinedProbability.toFixed(6)),
    conservativeProbability: Number(combinedProbability.toFixed(6)),
    weakestLeg,
    correlationPolicy: 'Only one selection per match is allowed to reduce direct same-match correlation.',
    independenceAssumption: 'The combined estimate multiplies distinct-match probabilities and assumes independence. Cross-match correlation is not modelled, so the true probability may differ.',
  };
}

export function buildTeamWinAccumulator(teamPredictions, options = {}) {
  const maxLegs = Math.min(7, options.maxLegs ?? 7);
  const minProbability = options.minProbability ?? 0.5;

  return buildAccumulatorSelections(teamPredictions, { maxLegs, minProbability });
}
