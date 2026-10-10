import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('track')
    .setDescription('Record a bet manually for bankroll tracking.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('bet')
        .setDescription('Track a single bet or accumulator')
        .addStringOption((option) => option.setName('market').setDescription('Market type').setRequired(true))
        .addStringOption((option) => option.setName('selection').setDescription('Selection, e.g. Manchester City win').setRequired(true))
        .addNumberOption((option) => option.setName('odds').setDescription('Decimal odds').setRequired(true))
        .addNumberOption((option) => option.setName('stake').setDescription('Stake value').setRequired(true))
        .addStringOption((option) => option.setName('bookmaker').setDescription('Optional bookmaker label').setRequired(false))
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const market = interaction.options.getString('market');
    const selection = interaction.options.getString('selection');
    const odds = interaction.options.getNumber('odds');
    const stake = interaction.options.getNumber('stake');
    const bookmaker = interaction.options.getString('bookmaker') || 'Manual entry';

    const embed = new EmbedBuilder()
      .setColor('#E67E22')
      .setTitle('🧾 Bet recorded')
      .addFields(
        { name: 'Market', value: market, inline: true },
        { name: 'Selection', value: selection, inline: true },
        { name: 'Odds', value: `@${odds.toFixed(2)}`, inline: true },
        { name: 'Stake', value: `£${stake.toFixed(2)}`, inline: true },
        { name: 'Bookmaker', value: bookmaker, inline: true },
        { name: 'Status', value: 'pending', inline: true }
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
