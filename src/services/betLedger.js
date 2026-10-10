export function createMatchKey(homeTeam, awayTeam) {
  return `${String(homeTeam).trim().toLowerCase()}|${String(awayTeam).trim().toLowerCase()}`;
}

export function isDuplicateFixture(existingFixtures, nextHomeTeam, nextAwayTeam) {
  const nextKey = createMatchKey(nextHomeTeam, nextAwayTeam);
  return existingFixtures.some((fixture) => createMatchKey(fixture.homeTeam, fixture.awayTeam) === nextKey);
}

export function settleBet(bet, result) {
  const homeGoals = Number(result.home ?? 0);
  const awayGoals = Number(result.away ?? 0);
  const outcome = bet.selection?.toLowerCase() || 'home win';

  if (bet.status === 'void') {
    return { ...bet, status: 'void', profitLoss: 0 };
  }

  if (bet.status === 'cashout') {
    return { ...bet, status: 'cashout', profitLoss: Number(bet.cashout ?? 0) };
  }

  const homeWin = homeGoals > awayGoals;
  const awayWin = awayGoals > homeGoals;

  if (outcome.includes('home') && homeWin) {
    return { ...bet, status: 'won', profitLoss: Number((bet.stake * (bet.odds - 1)).toFixed(2)) };
  }

  if (outcome.includes('away') && awayWin) {
    return { ...bet, status: 'won', profitLoss: Number((bet.stake * (bet.odds - 1)).toFixed(2)) };
  }

  if (outcome.includes('draw') && homeGoals === awayGoals) {
    return { ...bet, status: 'won', profitLoss: Number((bet.stake * (bet.odds - 1)).toFixed(2)) };
  }

  return { ...bet, status: 'lost', profitLoss: Number((-bet.stake).toFixed(2)) };
}

export function calculateProfitLoss(bet) {
  if (!bet || typeof bet.stake !== 'number' || typeof bet.odds !== 'number') {
    return 0;
  }

  if (bet.status === 'won') {
    return Number((bet.stake * (bet.odds - 1)).toFixed(2));
  }

  if (bet.status === 'lost') {
    return Number((-bet.stake).toFixed(2));
  }

  if (bet.status === 'void') {
    return 0;
  }

  if (bet.status === 'cashout') {
    return Number((bet.cashout ?? 0).toFixed(2));
  }

  return 0;
}
