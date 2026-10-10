import { Collection } from 'discord.js';

import helpCommand from './help.js';
import fixturesCommand from './fixtures.js';
import analyseCommand from './analyse.js';
import predictionsCommand from './predictions.js';
import betsCommand from './bets.js';
import accumulatorCommand from './accumulator.js';
import pingCommand from './ping.js';
import statusCommand from './status.js';

export const commandModules = [
  pingCommand,
  helpCommand,
  statusCommand,
  fixturesCommand,
  analyseCommand,
  predictionsCommand,
  betsCommand,
  accumulatorCommand,
];

export const commands = new Collection(
  commandModules.map((command) => [command.data.name, command])
);

export const commandData = commandModules.map((command) => command.data.toJSON());
