import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

const commandSummary = [
  '/ping — test connectivity and latency',
  '/help — show this command list',
  '/status — report bot and database health',
  '/fixtures — list upcoming fixtures from API-Football',
];

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List the available football bot commands.'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle('⚽ Football Intelligence Help')
      .setDescription('Stages 1–2 are active. Prediction commands remain disabled until their models and data inputs are verified.')
      .addFields({ name: 'Commands', value: commandSummary.join('\n') });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
