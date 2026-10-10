import { REST, Routes } from 'discord.js';

import { commandData } from './commands/index.js';
import { validateEnv } from './config/env.js';

try {
  const globalRegistration = process.argv.includes('--global');
  const registrationKeys = ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID'];
  if (!globalRegistration) {
    registrationKeys.push('DISCORD_GUILD_ID');
  }
  validateEnv(process.env, registrationKeys);

  const token = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  const rest = new REST({ version: '10' }).setToken(token);

  if (!globalRegistration) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commandData });
    console.log('Successfully registered guild commands.');
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commandData });
    console.log('Successfully registered global commands. Global changes can take time to appear.');
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
