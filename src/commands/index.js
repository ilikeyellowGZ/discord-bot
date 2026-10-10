import { Collection } from 'discord.js';

import helpCommand from './help.js';
import pingCommand from './ping.js';
import statusCommand from './status.js';

export const commandModules = [
  pingCommand,
  helpCommand,
  statusCommand,
];

export const commands = new Collection(
  commandModules.map((command) => [command.data.name, command])
);

export const commandData = commandModules.map((command) => command.data.toJSON());
