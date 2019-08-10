import { Command } from '../command';
import TwitchService from '../../services/twitchService';
import { BotContainer } from '../../inversify.config';
import { IUser } from '../../database/users';

export class TestCommand extends Command {
    constructor() {
        super();
    }
    public execute(channel: string, user: IUser): void {
        BotContainer.get(TwitchService).sendMessage(channel, 'Test message from a command!');
    }
}

export default TestCommand;
