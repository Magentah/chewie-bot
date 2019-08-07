import { Command } from '../command';
import TwitchService from '../../services/twitchService';
import { BotContainer } from '../../inversify.config';

export class TestCommand extends Command {
    constructor() {
        super();
    }
    public execute(channel: string): void {
        BotContainer.get(TwitchService).sendMessage(channel, 'Test message from a command!');
    }
}

export default TestCommand;
