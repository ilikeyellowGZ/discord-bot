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

  return env;
}
