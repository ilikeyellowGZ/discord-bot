import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

const commandSummary = [
  '/ping — test connectivity and latency',
  '/help — show this command list',
  '/status — report bot and database health',
  '/fixtures — list upcoming fixtures from API-Football',
  '/analyse fixture_id:<id> — model an upcoming fixture when current-season statistics are available',
  '/predictions — show today’s saved prediction snapshots',
  '/bets today — show today’s highest-qualified model selections',
  '/accumulator — build conservative and team-win suggestions from saved predictions',
];

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List the available football bot commands.'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle('⚽ Football Intelligence Help')
      .setDescription('Stages 1–4 are active. Prediction commands use saved pre-match snapshots and never generate sample selections.')
      .addFields({ name: 'Commands', value: commandSummary.join('\n') });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
