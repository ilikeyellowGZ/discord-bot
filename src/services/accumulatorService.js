export function buildAccumulatorSelections(predictions, options = {}) {
  const maxLegs = Math.min(7, options.maxLegs ?? 7);
  const minProbability = options.minProbability ?? 0.45;

  const selected = predictions
    .filter((prediction) => prediction.probability >= minProbability)
    .slice(0, maxLegs)
    .map((prediction) => ({
      match: prediction.match,
      market: prediction.market,
      selection: prediction.selection,
      probability: Number(prediction.probability.toFixed(4)),
      reason: prediction.reason || 'Model supports this selection with a stable probability estimate.',
      keyRisks: prediction.keyRisks || ['Data coverage varies by fixture.'],
      externalSource: prediction.externalSource || false,
    }));

  const combinedProbability = selected.reduce((total, leg) => total * leg.probability, 1);

  return {
    legs: selected,
    conservativeProbability: Number(combinedProbability.toFixed(6)),
    independenceAssumption: 'This estimate assumes independent legs for a simple probability estimate. Real accumulators are correlated and usually less likely to win than raw multiplication suggests.',
  };
}

export function buildTeamWinAccumulator(teamPredictions, options = {}) {
  const maxLegs = Math.min(7, options.maxLegs ?? 7);
  const minProbability = options.minProbability ?? 0.5;

  return buildAccumulatorSelections(
    teamPredictions
      .filter((prediction) => prediction.probability >= minProbability)
      .map((prediction) => ({
        ...prediction,
        market: 'Team Win',
        selection: `${prediction.match.homeTeam} to win`,
      })),
    { maxLegs, minProbability }
  );
}
