import { Logger } from '@overnightjs/logger';
import Constants from './../constants';
import { injectable } from 'inversify';
import * as Request from 'request-promise-native';
import * as sqlite from 'sqlite3';
import config = require('./../../config.json');

export interface ITwitchAuthResponse {
    access_token: string;
    expires_in: string;
    refresh_token: string;
    scope: string[];
    token_type: string;
}

export interface ITwitchRedirectResponse {
    code: string;
    scope: string;
}

@injectable()
class OAuthService {
    private testDB: sqlite.Database;
    constructor() {
        // Empty
        this.testDB = new sqlite.Database(':memory:');
        this.testDB.run('CREATE TABLE test(access_token text)');
    }

    public getTwitchAuthToken(authResponse: ITwitchRedirectResponse): void {
        const options = {
            method: 'POST',
            uri: 'https://id.twitch.tv/oauth2/token',
            qs: {
                client_id: config.twitch.client_id,
                client_secret: config.twitch.client_secret,
                code: authResponse.code,
                grant_type: 'authorization_code',
                redirect_uri: config.twitch.redirect_uri,
            },
            json: true,
        };

        Request(options)
        .then((response) => this.saveTwitchAuth(response))
        .catch((err) => Logger.Err(err));
    }

    public getTwitchAuthUrl(): string {
        const TwitchAuthURL = `${Constants.TwitchAuthUrl}?client_id=${config.twitch.client_id}&redirect_uri=${config.twitch.redirect_uri}&response_type=code&scope=${Constants.TwitchScopes}&claims=${Constants.TwitchClaims}`;
        return TwitchAuthURL;
    }

    private saveTwitchAuth(twitchAuth: ITwitchAuthResponse) {
        Logger.Info(`Saving Twitch Access Token: ${twitchAuth.access_token}`);
        this.testDB.run('INSERT INTO test(access_token) VALUES(?)', [twitchAuth.access_token], (err) => {
            if (err) {
                Logger.Err(err);
                return;
            }

            Logger.Info(`Added access_token ${twitchAuth.access_token} to test database`);
        });
    }
}

export default OAuthService;
