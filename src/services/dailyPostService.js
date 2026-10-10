import crypto from 'node:crypto';
import { EmbedBuilder } from 'discord.js';

import { env } from '../config/env.js';
import { claimDailyPost, completeDailyPost, getLocalDate, isDailyPostDue, releaseDailyPost } from './botConfigurationService.js';
import { loadTodayPredictions } from './predictionFeedService.js';
import { selectBestMarkets } from './predictionSelectionService.js';

const percentage = (value) => `${(Number(value) * 100).toFixed(1)}%`;

function buildSummaryEmbed(cards) {
  const selections = new Map(selectBestMarkets(cards).map((item) => [item.matchId, item]));
  const embed = new EmbedBuilder()
    .setColor('#00A884')
    .setTitle('Daily football analysis')
    .setDescription('Model probabilities only — not bookmaker odds, financial advice, or guaranteed outcomes.')
    .setTimestamp();
  for (const card of cards.slice(0, 6)) {
    const markets = card.snapshot.probabilities ?? {};
    const scores = (markets.exactScorelines ?? []).slice(0, 3)
      .map((item) => `${item.score} ${percentage(item.probability)}`).join(', ') || 'Unavailable';
    const selection = selections.get(card.matchId);
    const gaps = (card.snapshot.missingInputs ?? []).join(', ') || 'None reported';
    const kickoff = Math.floor(new Date(card.match.kickoffAt).getTime() / 1000);
    embed.addFields({
      name: `${card.match.homeTeam} vs ${card.match.awayTeam}`,
      value: [
        `${card.match.leagueName} • <t:${kickoff}:f>`,
        `Home ${percentage(markets.homeWin)} • Draw ${percentage(markets.draw)} • Away ${percentage(markets.awayWin)}`,
        `Top scores: ${scores}`,
        selection ? `Qualified market: ${selection.selection} (${percentage(selection.probability)})` : 'Qualified market: none at current thresholds',
        `Data gaps: ${gaps}`,
        `Full analysis: \`/analyse fixture_id:${card.matchId}\``,
      ].join('\n').slice(0, 1024),
    });
  }
  return embed;
}

export async function postDailySummary(client, config, {
  now = new Date(), timeZone = env.TIMEZONE, loadPredictions = loadTodayPredictions,
  claim = claimDailyPost, complete = completeDailyPost, release = releaseDailyPost,
} = {}) {
  if (!config?.dailyPostChannelId) return { status: 'skipped-no-channel' };
  if (!isDailyPostDue(config, now, timeZone)) return { status: 'not-due' };
  const cards = await loadPredictions({ now });
  if (cards.length === 0) return { status: 'skipped-no-predictions' };
  const date = getLocalDate(now, timeZone);
  const token = crypto.randomUUID();
  const claimed = await claim(date, token, { now });
  if (!claimed) return { status: 'already-posted-or-claimed' };
  try {
    const channel = await client.channels.fetch(config.dailyPostChannelId);
    if (!channel?.isTextBased?.() || typeof channel.send !== 'function') throw new Error('Configured daily post channel is not a text channel.');
    await channel.send({ embeds: [buildSummaryEmbed(cards)] });
    await complete(date, token, { now });
    return { status: 'posted', predictionCount: Math.min(cards.length, 6) };
  } catch (error) {
    await release(date, token);
    throw error;
  }
}
