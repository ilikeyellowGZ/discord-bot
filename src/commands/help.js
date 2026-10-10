import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

const commandSummary = [
  '/ping — test connectivity and latency',
  '/help — show this command list',
  '/status — report bot and database health',
];

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List the available football bot commands.'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle('⚽ Football Intelligence Help')
      .setDescription('Stage 1 is active. Football-data and prediction commands will be enabled only after their live integrations are implemented and verified.')
      .addFields({ name: 'Commands', value: commandSummary.join('\n') });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
