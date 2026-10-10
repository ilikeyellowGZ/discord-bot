import dotenv from 'dotenv';

dotenv.config();

export const requiredEnvKeys = [
  'DISCORD_BOT_TOKEN',
  'DISCORD_CLIENT_ID',
  'DISCORD_GUILD_ID',
  'MONGODB_URI',
  'API_FOOTBALL_KEY',
  'TIMEZONE',
  'ANALYSIS_HOURS_BEFORE_KICKOFF',
];

export const env = {
  ...process.env,
  TIMEZONE: process.env.TIMEZONE || 'Africa/Johannesburg',
  ANALYSIS_HOURS_BEFORE_KICKOFF: Number(process.env.ANALYSIS_HOURS_BEFORE_KICKOFF || 24),
  ANALYSIS_REFRESH_HOURS: Number(process.env.ANALYSIS_REFRESH_HOURS || 6),
  SCHEDULER_INTERVAL_MINUTES: Number(process.env.SCHEDULER_INTERVAL_MINUTES || 60),
  DAILY_POST_TIME: process.env.DAILY_POST_TIME || '08:00',
  DAILY_POST_CHANNEL_ID: process.env.DAILY_POST_CHANNEL_ID || '',
  FAVOURITE_TEAM_IDS: process.env.FAVOURITE_TEAM_IDS || '',
};

export function getMissingEnvironmentKeys(source = process.env, keys = requiredEnvKeys) {
  return keys.filter((key) => {
    const value = source[key];
    return value === undefined || String(value).trim() === '';
  });
}

export function validateEnv(source = process.env, keys = requiredEnvKeys) {
  const missing = getMissingEnvironmentKeys(source, keys);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. Copy .env.example to .env and populate the values.`
    );
  }

  const analysisHours = source.ANALYSIS_HOURS_BEFORE_KICKOFF;
  if (analysisHours !== undefined && (!Number.isFinite(Number(analysisHours)) || Number(analysisHours) <= 0)) {
    throw new Error('ANALYSIS_HOURS_BEFORE_KICKOFF must be a positive number.');
  }

  for (const key of ['ANALYSIS_REFRESH_HOURS', 'SCHEDULER_INTERVAL_MINUTES']) {
    if (source[key] !== undefined && (!Number.isFinite(Number(source[key])) || Number(source[key]) <= 0)) {
      throw new Error(`${key} must be a positive number.`);
    }
  }
  if (source.DAILY_POST_TIME !== undefined && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(source.DAILY_POST_TIME)) {
    throw new Error('DAILY_POST_TIME must use 24-hour HH:mm format.');
  }
  if (source.DAILY_POST_CHANNEL_ID && !/^\d{17,20}$/.test(source.DAILY_POST_CHANNEL_ID)) {
    throw new Error('DAILY_POST_CHANNEL_ID must be a Discord channel ID.');
  }

  return env;
}
