import { Command } from '../command';
import TextCommands from './../../database/textCommands';
import TwitchService from './../../services/twitchService';
import { BotContainer } from '../../inversify.config';

export class DelCmdCommand extends Command {
    constructor() {
        super();
    }

    public async execute(channel: string, username: string, commandName: string): Promise<void> {
        const deleted = await BotContainer.get(TextCommands).delete(commandName);
        if (deleted) {
            await BotContainer.get(TwitchService).sendMessage(channel, `!${commandName} has been removed!`);
        }
    }
}

export default DelCmdCommand;
