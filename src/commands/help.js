import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

const commandSummary = [
  '/ping — test connectivity and latency',
  '/help — show this command list',
  '/status — report bot and database health',
  '/fixtures — list upcoming fixtures from API-Football',
  '/analyse fixture_id:<id> — model an upcoming fixture when current-season statistics are available',
];

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List the available football bot commands.'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle('⚽ Football Intelligence Help')
      .setDescription('Stages 1–3 are active. Analysis requires current-season statistics from the configured API-Football plan.')
      .addFields({ name: 'Commands', value: commandSummary.join('\n') });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
