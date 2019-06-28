import * as tmi from 'tmi.js';
import { inject, injectable } from 'inversify';
import OAuthService from './oauthService';
import { Logger } from '@overnightjs/logger';
import * as config from './../config.json';

@injectable()
class TwitchService {
    private client: tmi.Client;
    private options: tmi.Options;

    constructor(@inject(OAuthService) private oauthService: OAuthService) {
        this.options = this.setupOptions();
        this.client = tmi.Client(this.options);
    }

    private setupOptions(): tmi.Options {
        return {
            options: {
                debug: true,
            },
            connection: {
                reconnect: true,
                secure: true,
            },
            identity: {
                username: config.twitch.username,
                password: `${config.twitch.oauth}`,
            },
            channels: [ `#${config.twitch.username}` ],
        };
    }

    private setupEventHandlers(): void {
        this.client.on('chat', this.chatEventHandler);
    }

    private chatEventHandler(channel: string, userstate: tmi.ChatUserstate, message: string, self: boolean) {
        Logger.Info(`Chat event: ${channel}:${userstate.username} -- ${message}`);
    }

    public connect(): void {
        Logger.Info('Connecting to Twitch.tv with tmi.js');
        this.client.connect();
    }

    public disconnect(): void {
        Logger.Info('Disconnecting from Twitch.tv');
        this.client.disconnect();
    }
}

export default TwitchService;
