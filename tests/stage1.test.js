import test from 'node:test';
import assert from 'node:assert/strict';

import { getMissingEnvironmentKeys, validateEnv } from '../src/config/env.js';
import { commands, commandData } from '../src/commands/index.js';

test('environment validation reports names without exposing configured values', () => {
  const source = {
    DISCORD_BOT_TOKEN: 'super-secret-token',
    DISCORD_CLIENT_ID: '',
    DISCORD_GUILD_ID: 'guild-id',
    MONGODB_URI: 'mongodb://private-host/database',
    API_FOOTBALL_KEY: 'api-secret',
    TIMEZONE: 'Africa/Johannesburg',
    ANALYSIS_HOURS_BEFORE_KICKOFF: '24',
  };

  assert.deepEqual(getMissingEnvironmentKeys(source), ['DISCORD_CLIENT_ID']);
  assert.throws(
    () => validateEnv(source),
    (error) => {
      assert.match(error.message, /DISCORD_CLIENT_ID/);
      assert.doesNotMatch(error.message, /super-secret-token|private-host|api-secret/);
      return true;
    }
  );
});

test('environment validation rejects an invalid analysis window', () => {
  const source = {
    DISCORD_BOT_TOKEN: 'token',
    DISCORD_CLIENT_ID: 'client',
    DISCORD_GUILD_ID: 'guild',
    MONGODB_URI: 'mongodb://localhost/database',
    API_FOOTBALL_KEY: 'key',
    TIMEZONE: 'Africa/Johannesburg',
    ANALYSIS_HOURS_BEFORE_KICKOFF: 'tomorrow',
  };

  assert.throws(() => validateEnv(source), /ANALYSIS_HOURS_BEFORE_KICKOFF/);
});

test('one registry provides unique executable slash commands for runtime and deployment', () => {
  const names = commandData.map((command) => command.name);

  assert.deepEqual(names.sort(), ['fixtures', 'help', 'ping', 'status']);
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.includes('ping'));
  assert.ok(names.includes('help'));
  assert.ok(names.includes('status'));
  assert.equal(commands.size, commandData.length);
  for (const command of commands.values()) {
    assert.equal(typeof command.execute, 'function');
  }
});

test('environment validation can use a command-specific required key set', () => {
  const source = {
    DISCORD_BOT_TOKEN: 'token',
    DISCORD_CLIENT_ID: 'client',
    MONGODB_URI: 'mongodb://localhost/database',
    API_FOOTBALL_KEY: 'key',
    TIMEZONE: 'Africa/Johannesburg',
    ANALYSIS_HOURS_BEFORE_KICKOFF: '24',
  };

  assert.doesNotThrow(() => validateEnv(source, ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID']));
});
