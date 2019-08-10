import { Command } from '../command';
import TextCommands from './../../database/textCommands';
import TwitchService from './../../services/twitchService';
import { BotContainer } from '../../inversify.config';
import { IUser } from '../../database/users';
import UserLevels from '../../database/userLevels';

export class AddCmdCommand extends Command {
    constructor() {
        super();
        // TODO: make userlevels constants
        BotContainer.get(UserLevels).get('Broadcaster').then((userLevel) => {
            this.minimumUserLevel = userLevel;
        });
    }

    public async execute(channel: string, user: IUser, commandName: string, message: string): Promise<void> {
        if (user && user.userLevel && user.userLevel.rank >= this.minimumUserLevel.rank) {
            let command = await BotContainer.get(TextCommands).get(commandName);
            if (!command) {
                command = {
                    commandName,
                    message,
                };

                await BotContainer.get(TextCommands).add(command);
                await BotContainer.get(TwitchService).sendMessage(channel, `!${commandName} has been added!`);
            }
        }
    }
}

export default AddCmdCommand;
