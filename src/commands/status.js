import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { env } from '../config/env.js';
import { getDatabaseStatus } from '../db/connect.js';

export default {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Display current bot health and environment status.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const dbStatus = getDatabaseStatus();
    const apiConfigured = Boolean(env.API_FOOTBALL_KEY && env.API_FOOTBALL_KEY.trim());
    const embed = new EmbedBuilder()
      .setColor(apiConfigured ? '#00A884' : '#F1C40F')
      .setTitle('🤖 Bot Status')
      .addFields(
        { name: 'Bot token', value: env.DISCORD_BOT_TOKEN ? 'Configured' : 'Missing', inline: true },
        { name: 'Client ID', value: env.DISCORD_CLIENT_ID ? 'Configured' : 'Missing', inline: true },
        { name: 'Guild ID', value: env.DISCORD_GUILD_ID ? 'Configured' : 'Missing', inline: true },
        { name: 'Database', value: dbStatus.connected ? 'Connected' : 'Unavailable', inline: true },
        { name: 'Football API', value: apiConfigured ? 'Configured' : 'Fallback mode', inline: true },
        { name: 'Timezone', value: env.TIMEZONE || 'Africa/Johannesburg', inline: true },
        { name: 'Analysis window', value: `${env.ANALYSIS_HOURS_BEFORE_KICKOFF || 24}h`, inline: true },
        { name: 'Last successful analysis', value: 'Not yet run', inline: false }
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
