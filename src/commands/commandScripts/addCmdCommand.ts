import { Command } from '../command';
import TextCommands from './../../database/textCommands';
import TwitchService from './../../services/twitchService';
import { BotContainer } from '../../inversify.config';

export class AddCmdCommand extends Command {
    constructor() {
        super();
    }

    public async execute(channel: string, username: string, commandName: string, message: string): Promise<void> {
        let command = await BotContainer.get(TextCommands).get(commandName);
        if (!command) {
            command = {
                commandName,
                message,
                modRequired: false,
            };

            await BotContainer.get(TextCommands).add(command);
            await BotContainer.get(TwitchService).sendMessage(channel, `!${commandName} has been added!`);
        }
    }
}

export default AddCmdCommand;
