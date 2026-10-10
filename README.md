# Football Intelligence Bot

A staged football prediction and betting-analysis bot built with Node.js ES modules, Discord.js v14, MongoDB, and Mongoose.

## Current status

Stages 1–3 are enabled. The runtime currently registers these verified commands:

- `/ping` — bot and WebSocket latency
- `/help` — enabled command list
- `/status` — bot configuration and MongoDB connection health
- `/fixtures [limit]` — upcoming live fixtures from API-Football (1–20)
- `/analyse fixture_id:<id>` — produce and save a Poisson analysis when current-season provider statistics are available

Later-stage command files are present from an earlier scaffold, but are deliberately not registered yet. Some contain sample placeholders and must not be treated as live football analysis. They will be replaced and enabled incrementally in Stages 4–7.

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

## Testing

```powershell
npm test
```

The suite currently covers Stage 1 configuration and command registration plus the pre-existing calculation tests. Live Discord, MongoDB, and API-Football connectivity require valid local credentials and are not exercised by unit tests.

## Planned stages

1. Discord startup, configuration, health commands, and database connection — enabled
2. API-Football provider, fixture persistence, caching, and `/fixtures` — enabled
3. Transparent Poisson model and match analysis — implemented; live 2026 data blocked by the configured free API plan
4. Predictions, betting analysis, and accumulator commands
5. Scheduling, daily posts, and favourite teams
6. Private bet tracking, settlement, and performance metrics
7. Permitted external-source adapters and controlled model evaluation

No command places bets or connects to bookmaker accounts.
