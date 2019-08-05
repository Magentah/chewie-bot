import { Command } from '../command';
import { inject, injectable } from 'inversify';
import TwitchService from '../../services/twitchService';
import { BotContainer } from '../../inversify.config';

@injectable()
export class TestCommand extends Command {
    constructor() {
        super();
    }
    public execute(channel: string): void {
        BotContainer.get(TwitchService).sendMessage(channel, 'Test message from a command!');
    }
}

export default TestCommand;
