import * as tmi from 'tmi.js';
import { inject, injectable } from 'inversify';
import OAuthService from './oauthService';
import { Logger } from '@overnightjs/logger';

@injectable()
class TwitchService {
    private client?: tmi.Client;
    private options: tmi.Options;

    constructor(@inject(OAuthService) private oauthService: OAuthService) {
        this.options = {
            options: {
                debug: true,
            },
            connection: {
                reconnect: true,
                secure: true,
            },
        };
    }

    public connect(): void {
        if (this.options === undefined) {
            this.setupOptions();
        }
        this.client = tmi.Client(this.options);
        Logger.Info('Connecting to Twitch.tv with tmi.js');
        this.client.connect();
    }

    private async setupOptions(): Promise<any> {
        const twitchUser = await this.oauthService.getTwitchUser();
        this.options.identity = {
            username: twitchUser.username,
            password: `oauth:${twitchUser.access_token}`,
        };
        this.options.channels = [ `#${twitchUser.username}}`];
    }
}

export default TwitchService;
