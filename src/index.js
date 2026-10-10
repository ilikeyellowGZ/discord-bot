import { Client, Events, GatewayIntentBits } from 'discord.js';

import { commands } from './commands/index.js';
import { validateEnv } from './config/env.js';
import { connectDatabase, getDatabaseStatus } from './db/connect.js';
import { startDailyAnalysisJob } from './jobs/dailyAnalysis.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = commands;

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);

  try {
    const dbStatus = getDatabaseStatus();
    console.log(`Database status: ${dbStatus.connected ? 'connected' : 'not connected'}`);
    if (dbStatus.connected) {
      startDailyAnalysisJob(readyClient);
      console.log('Daily analysis scheduler started.');
    } else {
      console.warn('Daily analysis scheduler skipped because MongoDB is unavailable.');
    }
  } catch (error) {
    console.warn('Database status check failed:', error.message);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.warn(`No matching command found for: ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction); 
  } catch (error) {
    console.error('Command execution failed:', error);

    const response = {
      content: 'Something went wrong while processing that command. Please try again or contact an administrator.',
      ephemeral: true,
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(response);
      return;
    }

    await interaction.reply(response);
  }
});

try {
  validateEnv();

  try {
    await connectDatabase();
    console.log('MongoDB connection established.');
  } catch (databaseError) {
    console.warn('MongoDB is not available. Starting the bot in degraded mode:', databaseError.message);
  }

  await client.login(process.env.DISCORD_BOT_TOKEN);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
