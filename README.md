# Football Intelligence Bot

A staged football prediction and betting-analysis bot built with Node.js ES modules, Discord.js v14, MongoDB, and Mongoose.

## Current status

Stages 1–4 are enabled. The runtime currently registers these verified commands:

- `/ping` — bot and WebSocket latency
- `/help` — enabled command list
- `/status` — bot configuration and MongoDB connection health
- `/fixtures [limit]` — upcoming live fixtures from API-Football (1–20)
- `/analyse fixture_id:<id>` — produce and save a Poisson analysis when current-season provider statistics are available
- `/predictions` — show today’s saved pre-match snapshots
- `/bets today` — show the highest-qualified probability-based selection per match
- `/accumulator` — generate conservative multi-market and team-win suggestions

Later-stage command files are present from an earlier scaffold, but are deliberately not registered yet. They will be replaced and enabled incrementally in Stages 5–7.

## Requirements

- Node.js 18 or newer
- An existing Discord application and bot user
- An existing Discord server where you can install that bot
- A MongoDB connection URI
- An API-Football key for later football-data stages

Do not create a second Discord application. Reuse the bot and server IDs already associated with this project.

## Configuration

Copy `.env.example` to `.env`, then populate the values locally:

```powershell
Copy-Item .env.example .env
```

Required variables:

- `DISCORD_BOT_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_GUILD_ID`
- `MONGODB_URI`
- `API_FOOTBALL_KEY`
- `TIMEZONE`
- `ANALYSIS_HOURS_BEFORE_KICKOFF`

`.env` is ignored by Git. Never commit it or paste its values into chat, logs, or Discord.

## Discord installation and permissions

The bot uses only the `Guilds` gateway intent in Stage 1. It does not require privileged message, member, or presence intents.

Install the existing application with the `bot` and `applications.commands` scopes. Grant only:

- View Channels
- Send Messages
- Embed Links
- Read Message History

Administrator permission is not required.

## Install, register, and run

```powershell
npm install
npm test
npm run register
npm start
```

`npm run register` registers commands in `DISCORD_GUILD_ID`, which is the recommended development workflow because guild updates appear quickly.

After the commands are production-ready, register them globally with:

```powershell
npm run register:global
```

Global command changes may take time to appear. Running either registration command updates the existing application; it does not create a new bot.

For local development with automatic restarts:

```powershell
npm run dev
```

## Startup behavior

Startup validates configuration without printing secret values. The bot attempts MongoDB before Discord login. If MongoDB is temporarily unavailable, it logs a warning and starts in degraded mode; `/fixtures` can still return live data but skips persistence.

## Football data behavior

The API-Football client uses the fixed official v3 host and the `x-apisports-key` header. It uses date queries compatible with the free plan and scans at most three calendar dates until it has enough fixtures. It filters out past/cancelled fixtures, sorts by kickoff, and applies the requested limit locally. Responses are cached in memory for five minutes, concurrent identical requests are deduplicated, and transient failures retry at most twice with bounded exponential backoff.

Returned fixtures are upserted into MongoDB by immutable provider fixture ID. No sample or invented fixture fallback is used. Provider errors produce a user-safe Discord response.

## Prediction model

`poisson-v1.1` estimates home and away goals from provider-backed home/away scoring and conceding totals. Rates are smoothed toward observed league home/away averages with a five-match prior. Recent form is recency-weighted and capped to a modest ±8% effect. The home advantage is represented by separate league home and away scoring baselines rather than an additional arbitrary multiplier.

The normalized score grid produces mutually consistent match-result, double-chance, over/under, BTTS, team-total, first-team-to-score, and top-six exact-score probabilities. Every analysis records its timestamp, fixture/team IDs, model version, feature inputs, sample sizes, missing inputs, limitations, full distribution, and probabilities before kickoff.

API-Football's configured free plan currently blocks 2026 team-season statistics and completed league queries, allowing seasons 2022–2024 only. Current fixtures can be listed, but current-season `/analyse` requests will therefore explain that coverage is unavailable and will not generate a prediction. Upgrading the provider subscription is required for live 2026 analysis; the bot will not substitute stale or invented inputs.

## Stage 4 selection rules

Stage 4 reads only saved pre-match snapshots; it never creates sample picks. A prediction must have at least 20 completed league matches and five relevant home/away matches per team before it can produce a selection. Market-specific probability thresholds are applied, and no selection is forced when none qualifies.

Accumulator suggestions contain at most seven legs and allow only one leg per match to remove direct same-match correlation. Combined probability is shown only under an explicit distinct-match independence assumption. Each response identifies its weakest leg, data gaps, and why the full slip could fail. No bookmaker odds are fabricated and no bet is placed automatically.

## Testing

```powershell
npm test
```

The suite covers configuration, command registration, provider behavior, fixture persistence, Poisson calculations, analysis snapshots, prediction feeds, selection thresholds, correlation controls, and Discord command responses. Live integration is verified separately with configured local credentials.

## Planned stages

1. Discord startup, configuration, health commands, and database connection — enabled
2. API-Football provider, fixture persistence, caching, and `/fixtures` — enabled
3. Transparent Poisson model and match analysis — implemented; live 2026 data blocked by the configured free API plan
4. Predictions, betting analysis, and accumulator commands — enabled; honest empty states until valid current-season snapshots exist
5. Scheduling, daily posts, and favourite teams
6. Private bet tracking, settlement, and performance metrics
7. Permitted external-source adapters and controlled model evaluation

No command places bets or connects to bookmaker accounts.
