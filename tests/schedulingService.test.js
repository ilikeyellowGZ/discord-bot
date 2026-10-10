import test from 'node:test';
import assert from 'node:assert/strict';

import { selectFixturesForAnalysis } from '../src/services/schedulingService.js';

const NOW = new Date('2026-10-10T10:00:00Z');

function fixture(id, hoursFromNow, homeId = 1, awayId = 2, status = 'NS') {
  return {
    fixture: {
      id,
      date: new Date(NOW.getTime() + hoursFromNow * 3_600_000).toISOString(),
      status: { short: status },
    },
    teams: { home: { id: homeId }, away: { id: awayId } },
  };
}

test('selects upcoming fixtures inside the analysis window', () => {
  const selected = selectFixturesForAnalysis([fixture(1, 23), fixture(2, 25)], [], {
    now: NOW, analysisHours: 24,
  });

  assert.deepEqual(selected.map((item) => item.fixture.id), [1]);
});

test('favourite-team fixtures bypass the normal analysis window but not upcoming-status checks', () => {
  const selected = selectFixturesForAnalysis([
    fixture(1, 48, 99, 2),
    fixture(2, 48),
    fixture(3, -1, 99, 2),
    fixture(4, 2, 99, 2, 'CANC'),
  ], [], { now: NOW, analysisHours: 24, favouriteTeamIds: ['99'] });

  assert.deepEqual(selected.map((item) => item.fixture.id), [1]);
});

test('skips duplicate fixtures and recently refreshed snapshots', () => {
  const snapshots = [{ matchId: '1', predictionTimestamp: new Date(NOW.getTime() - 2 * 3_600_000) }];
  const selected = selectFixturesForAnalysis([fixture(1, 3), fixture(1, 3), fixture(2, 4)], snapshots, {
    now: NOW, analysisHours: 24, refreshHours: 6,
  });

  assert.deepEqual(selected.map((item) => item.fixture.id), [2]);
});

