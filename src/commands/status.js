import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { env } from '../config/env.js';
import { getDatabaseStatus } from '../db/connect.js';
import { getAnalysisState } from '../jobs/dailyAnalysis.js';
import { footballApiService } from '../services/footballApiService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Display current bot health and environment status.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const dbStatus = getDatabaseStatus();
    const apiHealth = footballApiService.getHealth();
    const apiConfigured = apiHealth.configured;
    const analysisState = getAnalysisState();
    const lastAnalysis = analysisState.lastSuccessfulAnalysisAt
      ? `<t:${Math.floor(new Date(analysisState.lastSuccessfulAnalysisAt).getTime() / 1000)}:R>`
      : 'No successful analysis yet';
    const embed = new EmbedBuilder()
      .setColor(apiConfigured ? '#00A884' : '#F1C40F')
      .setTitle('🤖 Bot Status')
      .addFields(
        { name: 'Bot token', value: env.DISCORD_BOT_TOKEN ? 'Configured' : 'Missing', inline: true },
        { name: 'Client ID', value: env.DISCORD_CLIENT_ID ? 'Configured' : 'Missing', inline: true },
        { name: 'Guild ID', value: env.DISCORD_GUILD_ID ? 'Configured' : 'Missing', inline: true },
        { name: 'Database', value: dbStatus.connected ? 'Connected' : 'Unavailable', inline: true },
        { name: 'Football API', value: apiConfigured ? (apiHealth.lastErrorCode ? `Configured (${apiHealth.lastErrorCode})` : 'Configured') : 'Not configured', inline: true },
        { name: 'Timezone', value: env.TIMEZONE || 'Africa/Johannesburg', inline: true },
        { name: 'Analysis window', value: `${env.ANALYSIS_HOURS_BEFORE_KICKOFF || 24}h`, inline: true },
        { name: 'Last successful analysis', value: lastAnalysis, inline: false },
        { name: 'Scheduler', value: dbStatus.connected ? (analysisState.running ? 'Running a cycle' : 'Active') : 'Disabled without database', inline: true }
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
