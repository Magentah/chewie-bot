import { Logger } from '@overnightjs/logger';
import Constants from './../constants';
import { injectable, inject } from 'inversify';
import * as Request from 'request-promise-native';
import * as sqlite from 'sqlite3';
import DatabaseService from './databaseService';
import { CacheService, CacheType } from './cacheService';
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
}

// Twitch OAuth is for logging in users through the front end. For the chatbot oauth, we should be using https://twitchapps.com/tmi/ with the bot account login.

@injectable()
class OAuthService {
    // Populated immediately after authenticating with Twitch
    private twitchUser: ITwitchUser = { username: '' };

    constructor(@inject(DatabaseService) private databaseService: DatabaseService, @inject(CacheService) private cacheService: CacheService) {
        // Empty
        this.databaseService.initDatabase('test.db');
        Logger.Info('Creating table');
        this.databaseService.asyncRun('CREATE TABLE if not exists test(id integer primary key, refresh_token text, username text)');
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
        try {
            const accessToken = await this.getTwitchAccessToken();

            const options = {
                method: 'GET',
                uri: 'https://id.twitch.tv/oauth2/userinfo',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                json: true,
            };

            const userInfoResponse = await Request(options);
            Logger.Info(JSON.stringify(userInfoResponse));
            this.twitchUser = {
                username: userInfoResponse.preferred_username,

            };

            return this.twitchUser;
        } catch (err) {
            Logger.Err(err);
            throw err;
        }
    }

    public async refreshTwitchToken(): Promise<string> {
        Logger.Info('Refreshing Twitch.tv OAuth token.');

        try {
            // Get refresh token from test database. Only a single user in single table, so just select everything.
            const result = await this.databaseService.asyncGet('SELECT * FROM test');
            const refresh_token = result.refresh_token;
            const options = {
                method: 'POST',
                url: `https://id.twitch.tv/oauth2/token`,
                form: {
                    client_id: config.twitch.client_id,
                    client_secret: config.twitch.client_secret,
                    grant_type: 'refresh_token',
                    refresh_token,
                },
            };

            const refreshResponse = await Request(options);
            Logger.Info(JSON.stringify(refreshResponse));

            await this.databaseService.asyncRun('UPDATE test SET refresh_token = ? WHERE username = ?', [refresh_token, this.twitchUser.username]);

            // Cache the access token. Default set to 60s TTL. We should be using the refresh token to get a new access token every 30-60s.
            await this.cacheService.set(CacheType.OAuth, Constants.TwitchCacheAccessToken, refreshResponse.access_token);
            return refreshResponse.access_token;
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
            const accessToken = await this.getTwitchAccessToken();
            Logger.Info(accessToken);
            const options = {
                method: 'GET',
                uri: 'https://id.twitch.tv/oauth2/validate',
                headers: {
                    Authorization: `OAuth ${accessToken}`,
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
     * Saves the Twitch.tv OAuth refrsh token to a test database and adds the access_token to a cache.
     * @param twitchAuth The response object from https://id.twitch.tv/oauth2/token
     */
    private async saveTwitchAuth(twitchAuth: ITwitchAuthResponse): Promise<any> {
        try {
            const result = await this.databaseService.asyncRun('INSERT INTO test (refresh_token) VALUES (?)', [twitchAuth.refresh_token]);
            this.cacheService.set(CacheType.OAuth, Constants.TwitchCacheAccessToken, twitchAuth.access_token);
        } catch (err) {
            Logger.Err(err);
        }
    }

    /**
     * Gets the Twitch.tv OAuth token from the cache. If the TTL has expired, refreshes the access token before returning.
     */
    private async getTwitchAccessToken(): Promise<string> {
        let accessToken = await this.cacheService.get(CacheType.OAuth, Constants.TwitchCacheAccessToken);
        Logger.Info(`Access token from cache: ${accessToken}`);
        if (!accessToken) {
            accessToken = await this.refreshTwitchToken();
        }

        Logger.Info(`Returning twitch access token ${accessToken}`);
        return accessToken;
    }
}

export default OAuthService;
