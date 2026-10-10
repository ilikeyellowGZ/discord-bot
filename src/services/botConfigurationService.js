import crypto from 'node:crypto';

import { env } from '../config/env.js';
import BotConfiguration from '../models/BotConfiguration.js';

export function validateDailyPostTime(value) {
  const normalized = String(value ?? '').trim();
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
    throw new TypeError('Daily post time must use 24-hour HH:mm format.');
  }
  return normalized;
}

export function normalizeFavouriteTeamIds(values, maximum = 20) {
  const source = Array.isArray(values) ? values : String(values ?? '').split(',');
  return [...new Set(source.map((value) => String(value).trim())
    .filter((value) => /^\d+$/.test(value) && Number(value) > 0))].slice(0, maximum);
}

function localParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` };
}

export function getLocalDate(date = new Date(), timeZone = env.TIMEZONE) {
  return localParts(date, timeZone).date;
}

export function isDailyPostDue(config, now = new Date(), timeZone = env.TIMEZONE) {
  const local = localParts(now, timeZone);
  return local.time >= validateDailyPostTime(config.dailyPostTime ?? '08:00')
    && config.lastDailyPostDate !== local.date;
}

export async function getBotConfiguration({ model = BotConfiguration } = {}) {
  const defaults = {
    key: 'primary',
    dailyPostChannelId: env.DAILY_POST_CHANNEL_ID || null,
    dailyPostTime: validateDailyPostTime(env.DAILY_POST_TIME || '08:00'),
    favouriteTeamIds: normalizeFavouriteTeamIds(env.FAVOURITE_TEAM_IDS),
    timezone: env.TIMEZONE,
  };
  return model.findOneAndUpdate(
    { key: 'primary' },
    { $setOnInsert: defaults },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
}

export async function claimDailyPost(date, token = crypto.randomUUID(), {
  model = BotConfiguration, now = new Date(), leaseMinutes = 10,
} = {}) {
  const staleBefore = new Date(new Date(now).getTime() - leaseMinutes * 60_000);
  return model.findOneAndUpdate({
    key: 'primary',
    lastDailyPostDate: { $ne: date },
    $or: [
      { dailyPostClaimDate: { $ne: date } },
      { dailyPostClaimedAt: { $lt: staleBefore } },
    ],
  }, { $set: {
    dailyPostClaimDate: date,
    dailyPostClaimToken: token,
    dailyPostClaimedAt: new Date(now),
  } }, { new: true }).lean();
}

export async function completeDailyPost(date, token, { model = BotConfiguration, now = new Date() } = {}) {
  return model.updateOne(
    { key: 'primary', dailyPostClaimDate: date, dailyPostClaimToken: token },
    { $set: { lastDailyPostDate: date, lastDailyPostAt: new Date(now) }, $unset: {
      dailyPostClaimDate: 1, dailyPostClaimToken: 1, dailyPostClaimedAt: 1,
    } }
  );
}

export async function releaseDailyPost(date, token, { model = BotConfiguration } = {}) {
  return model.updateOne(
    { key: 'primary', dailyPostClaimDate: date, dailyPostClaimToken: token },
    { $unset: { dailyPostClaimDate: 1, dailyPostClaimToken: 1, dailyPostClaimedAt: 1 } }
  );
}

