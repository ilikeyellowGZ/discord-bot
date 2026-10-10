import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { env } from '../config/env.js';
import { getDatabaseStatus } from '../db/connect.js';
import { FootballApiError, footballApiService } from '../services/footballApiService.js';
import { syncFixtures } from '../services/fixtureRepository.js';

function providerErrorMessage(error) {
  if (error.code === 'NOT_CONFIGURED') return 'Football data is not configured yet. Ask an administrator to check API_FOOTBALL_KEY.';
  if (error.code === 'RATE_LIMITED') return 'The football data provider rate limit has been reached. Please try again later.';
  return 'Live fixture data is temporarily unavailable. Please try again later.';
}

export function createFixturesCommand({
  service = footballApiService,
  databaseStatus = getDatabaseStatus,
  persist = syncFixtures,
} = {}) {
  return {
    data: new SlashCommandBuilder()
      .setName('fixtures')
      .setDescription('List upcoming football fixtures from API-Football.')
      .addIntegerOption((option) => option
        .setName('limit')
        .setDescription('Number of fixtures to show (1–20)')
        .setMinValue(1)
        .setMaxValue(20)),

    async execute(interaction) {
      await interaction.deferReply({ ephemeral: true });
      const limit = interaction.options.getInteger('limit') ?? 10;

      let fixtures;
      try {
        fixtures = await service.getUpcomingFixtures(limit);
      } catch (error) {
        if (error instanceof FootballApiError) {
          await interaction.editReply(providerErrorMessage(error));
          return;
        }
        throw error;
      }

      if (fixtures.length === 0) {
        await interaction.editReply('The provider returned no upcoming fixtures for this request.');
        return;
      }

      if (databaseStatus().connected) {
        try {
          await persist(fixtures);
        } catch {
          console.warn('Fixture persistence failed; returning live provider data without database caching.');
        }
      }

      const dateFormatter = new Intl.DateTimeFormat('en-ZA', {
        timeZone: env.TIMEZONE || 'Africa/Johannesburg',
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const fields = fixtures.flatMap((fixture) => {
        const home = fixture?.teams?.home?.name;
        const away = fixture?.teams?.away?.name;
        const league = fixture?.league?.name;
        const fixtureId = fixture?.fixture?.id;
        const kickoff = new Date(fixture?.fixture?.date);
        if (!home || !away || !league || !fixtureId || Number.isNaN(kickoff.getTime())) return [];
        const status = fixture?.fixture?.status?.short;
        const statusText = status && status !== 'NS' ? ` • ${status}` : '';
        return [{ name: `${home} vs ${away}`, value: `${league} • ${dateFormatter.format(kickoff)}${statusText}\nFixture ID: ${fixtureId}` }];
      });

      if (fields.length === 0) {
        await interaction.editReply('The provider returned fixtures, but none contained enough data to display safely.');
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#E74C3C')
        .setTitle('📅 Upcoming fixtures')
        .setDescription(`Kickoff times shown in ${env.TIMEZONE || 'Africa/Johannesburg'}.`)
        .addFields(fields)
        .setFooter({ text: 'Source: API-Football' })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    },
  };
}

export default createFixturesCommand();
