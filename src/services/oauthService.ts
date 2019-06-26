import { Logger } from '@overnightjs/logger';
import Constants from './../constants';
import { injectable, inject } from 'inversify';
import * as Request from 'request-promise-native';
import * as sqlite from 'sqlite3';
import DatabaseService from './databaseService';
import config = require('./../config.json');
import { promises } from 'fs';

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
    constructor(@inject(DatabaseService) private databaseService: DatabaseService) {
        // Empty
        this.databaseService.initDatabase('test.db');
        Logger.Info('Creating table');
        this.databaseService.asyncRun('CREATE TABLE if not exists test(id integer primary key, access_token text)');
        Logger.Info('Table created');
    }

    /**
     * Gets an oauth token from Twitch.tv
     * @param authResponse Response object from https://id.twitch.tv/oauth2/authorize
     */
    public async getTwitchAuthToken(authResponse: ITwitchRedirectResponse): Promise<any> {
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

        try {
            const response = await Request(options);
            const twitchAuth = await this.saveTwitchAuth(response);
        } catch (err) {
            Logger.Err(err);
        }
    }

    /**
     * Gets User Info from Twitch.tv
     */
    public async getTwitchUserInfo(): Promise<any> {
        Logger.Info('Getting Twitch User Info');
        let twitchAuthToken: string;
        try {
            const result = await this.databaseService.asyncGet('SELECT * FROM test');
            twitchAuthToken = result.access_token;

            const options = {
                method: 'GET',
                uri: 'https://id.twitch.tv/oauth2/userinfo',
                headers: {
                    Authorization: `Bearer ${twitchAuthToken}`,
                },
                json: true,
            };

            const userInfoResponse = await Request(options);
            Logger.Info(JSON.stringify(userInfoResponse));
        } catch (err) {
            Logger.Err(err);
        }
    }

    /**
     * Verifies the Twitch.tv OAuth token.
     */
    public async verifyTwitchOauth(): Promise<any> {
        Logger.Info('Verifying OAuth token');

        try {
            const result = await this.databaseService.asyncGet('SELECT * FROM test');
            const access_token = result.access_token;
            const options = {
                method: 'GET',
                uri: 'https://id.twitch.tv/oauth2/validate',
                headers: {
                    Authorization: `OAuth ${access_token}`,
                },
                json: true,
            };

            const validateResponse = await Request(options);
            Logger.Info('Got verification');
            Logger.Info(JSON.stringify(validateResponse));
        } catch (err) {
            Logger.Err(err);
            throw err;
        }
    }

    /**
     * Gets the Twitch.tv Authorize URL populated with all parameters.
     */
    public getTwitchAuthUrl(): string {
        const TwitchAuthURL = `${Constants.TwitchAuthUrl}?client_id=${config.twitch.client_id}&redirect_uri=${config.twitch.redirect_uri}&response_type=code&scope=${Constants.TwitchScopes}&claims=${Constants.TwitchClaims}`;
        return TwitchAuthURL;
    }

    /**
     * Saves the Twitch.tv OAuth token to a test database
     * @param twitchAuth The response object from https://id.twitch.tv/oauth2/token
     */
    private async saveTwitchAuth(twitchAuth: ITwitchAuthResponse): Promise<any> {
        Logger.Info(`Saving Twitch Access Token: ${twitchAuth.access_token}`);
        try {
            const result = await this.databaseService.asyncRun('INSERT INTO test(access_token) VALUES(?)', [twitchAuth.access_token]);
            Logger.Info(`Added access_token ${twitchAuth.access_token} to test database`);
        } catch (err) {
            Logger.Err(err);
        }
    }
}

export default OAuthService;
