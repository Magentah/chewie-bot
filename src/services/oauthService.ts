import { Logger } from '@overnightjs/logger';
import Constants from './../constants';
import { injectable, inject } from 'inversify';
import * as Request from 'request-promise-native';
import * as sqlite from 'sqlite3';
import DatabaseService from './databaseService';
import config = require('./../config.json');
import { promises, access } from 'fs';

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

export interface ITwitchUser {
    username: string;
    access_token: string;
}

// Twitch OAuth is for logging in users through the front end. For the chatbot oauth, we should be using https://twitchapps.com/tmi/ with the bot account login.

@injectable()
class OAuthService {
    private twitchUser?: ITwitchUser;

    constructor(@inject(DatabaseService) private databaseService: DatabaseService) {
        // Empty
        this.databaseService.initDatabase('test.db');
        Logger.Info('Creating table');
        this.databaseService.asyncRun('CREATE TABLE if not exists test(id integer primary key, access_token text, username text)');
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

    public async getTwitchUser(): Promise<ITwitchUser> {
        try {
            if (this.twitchUser !== undefined) {
                return this.twitchUser;
            } else {
                return await this.getTwitchUserInfo();
            }
        } catch (err) {
            Logger.Err(err);
            throw err;
        }
    }

    /**
     * Gets User Info from Twitch.tv
     */
    public async getTwitchUserInfo(): Promise<ITwitchUser> {
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
            await this.databaseService.asyncRun('UPDATE test SET username = ? where access_token = ?', [userInfoResponse.preferred_username, twitchAuthToken]);
            this.twitchUser = {
                username: userInfoResponse.preferred_username,
                access_token: twitchAuthToken,
            };
            return this.twitchUser;
            Logger.Info(JSON.stringify(userInfoResponse));
        } catch (err) {
            Logger.Err(err);
            throw err;
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
            Logger.Info(`Verifying token: ${access_token}`);
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
            const result = await this.databaseService.asyncRun('INSERT INTO test (access_token) VALUES (?)', [twitchAuth.access_token]);
            Logger.Info(`Added access_token ${twitchAuth.access_token} to test database`);
        } catch (err) {
            Logger.Err(err);
        }
    }
}

export default OAuthService;
