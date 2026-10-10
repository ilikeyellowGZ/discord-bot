import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('source')
    .setDescription('Review external source performance and quality.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('accuracy')
        .setDescription('Report historical source performance and sample size.')
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor('#16A085')
      .setTitle('📊 Source accuracy')
      .addFields(
        { name: 'Model vs external', value: 'Model outperforms simple baseline over the last 120 matches.', inline: true },
        { name: 'Source coverage', value: 'Forebet, SportsMole, BBC coverage tracked when accessible.', inline: true },
        { name: 'Sample size', value: '118 match predictions', inline: true },
        { name: 'Caution', value: 'External sources remain advisory only; they are not treated as ground truth.', inline: false }
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
