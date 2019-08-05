import { inject } from 'inversify';
import { BotContainer } from './../inversify.config';
import TwitchService from '../services/twitchService';


export abstract class Command {
    public execute(channel: string): void {
        // Empty
    }
}
