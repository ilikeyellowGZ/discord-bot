import test from 'node:test';
import assert from 'node:assert/strict';

import {
  claimDailyPost,
  isDailyPostDue,
  normalizeFavouriteTeamIds,
  validateDailyPostTime,
} from '../src/services/botConfigurationService.js';

test('validates posting time and normalizes bounded provider team IDs', () => {
  assert.equal(validateDailyPostTime('08:30'), '08:30');
  assert.throws(() => validateDailyPostTime('25:00'), /HH:mm/);
  assert.deepEqual(normalizeFavouriteTeamIds(['42', 42, ' 7 ', 'bad', -1]), ['42', '7']);
});

test('daily post is due at or after configured local time and only once per local date', () => {
  const before = new Date('2026-10-10T05:59:00Z');
  const due = new Date('2026-10-10T06:01:00Z');
  const config = { dailyPostTime: '08:00', lastDailyPostDate: null };

  assert.equal(isDailyPostDue(config, before, 'Africa/Johannesburg'), false);
  assert.equal(isDailyPostDue(config, due, 'Africa/Johannesburg'), true);
  assert.equal(isDailyPostDue({ ...config, lastDailyPostDate: '2026-10-10' }, due, 'Africa/Johannesburg'), false);
});

test('daily post claim uses one atomic database update with an expiring lease', async () => {
  let filter;
  let update;
  const model = {
    findOneAndUpdate(receivedFilter, receivedUpdate) {
      filter = receivedFilter;
      update = receivedUpdate;
      return { lean: async () => ({ key: 'primary', dailyPostClaimToken: 'token' }) };
    },
  };

  const claimed = await claimDailyPost('2026-10-10', 'token', {
    model, now: new Date('2026-10-10T06:05:00Z'), leaseMinutes: 10,
  });

  assert.equal(claimed.dailyPostClaimToken, 'token');
  assert.equal(filter.key, 'primary');
  assert.equal(filter.lastDailyPostDate.$ne, '2026-10-10');
  assert.equal(filter.$or[0].dailyPostClaimDate.$ne, '2026-10-10');
  assert.equal(update.$set.dailyPostClaimDate, '2026-10-10');
});

