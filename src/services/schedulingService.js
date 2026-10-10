const UPCOMING_STATUSES = new Set(['NS', 'TBD']);

function fixtureId(item) {
  return String(item?.fixture?.id ?? '');
}

export function selectFixturesForAnalysis(fixtures, snapshots, {
  now = new Date(),
  analysisHours = 24,
  refreshHours = 6,
  favouriteTeamIds = [],
} = {}) {
  const nowDate = new Date(now);
  const windowEnd = nowDate.getTime() + Number(analysisHours) * 3_600_000;
  const refreshCutoff = nowDate.getTime() - Number(refreshHours) * 3_600_000;
  const favourites = new Set(favouriteTeamIds.map(String));
  const latestSnapshots = new Map();

  for (const snapshot of snapshots ?? []) {
    const id = String(snapshot.matchId);
    const timestamp = new Date(snapshot.predictionTimestamp).getTime();
    if (Number.isFinite(timestamp) && timestamp > (latestSnapshots.get(id) ?? 0)) {
      latestSnapshots.set(id, timestamp);
    }
  }

  const unique = new Map();
  for (const item of fixtures ?? []) {
    const id = fixtureId(item);
    const kickoff = Date.parse(item?.fixture?.date);
    const status = item?.fixture?.status?.short;
    if (!id || !Number.isFinite(kickoff) || kickoff <= nowDate.getTime() || !UPCOMING_STATUSES.has(status)) continue;
    const isFavourite = favourites.has(String(item?.teams?.home?.id))
      || favourites.has(String(item?.teams?.away?.id));
    if (!isFavourite && kickoff > windowEnd) continue;
    if ((latestSnapshots.get(id) ?? 0) >= refreshCutoff) continue;
    if (!unique.has(id)) unique.set(id, item);
  }

  return [...unique.values()].sort((left, right) => Date.parse(left.fixture.date) - Date.parse(right.fixture.date));
}

