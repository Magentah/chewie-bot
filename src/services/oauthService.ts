import { Logger } from '@overnightjs/logger';
import Constants from './../constants';
import { injectable, inject } from 'inversify';
import * as Request from 'request-promise-native';
import * as sqlite from 'sqlite3';
import DatabaseService from './databaseService';
import { CacheService, CacheType } from './cacheService';
import config = require('./../config.json');
import { promises, access } from 'fs';
import CryptoHelper from '../helpers/cryptoHelper';
import { ITwitchAuthResponse, ITwitchRedirectResponse, ITwitchIDToken } from '../models/twitchApi';

export interface ITwitchUser {
    username: string;
}

// Twitch OAuth is for logging in users through the front end. For the chatbot oauth, we should be using https://twitchapps.com/tmi/ with the bot account login.

@injectable()
class OAuthService {
    // Populated immediately after authenticating with Twitch
    private twitchUser: ITwitchUser = { username: '' };
    private nonce: string = '';

    constructor(@inject(DatabaseService) private databaseService: DatabaseService, @inject(CacheService) private cacheService: CacheService) {
        // Empty
        this.databaseService.initDatabase('chewiebot.db');
        Logger.Info('Creating table');
        this.databaseService.asyncRun('CREATE TABLE if not exists user(id integer primary key, id_token text, username text, refresh_token text)');
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
                nonce: this.nonce,
            },
            json: true,
        };

        try {
            const response = await Request(options);
            if (response.nonce === this.nonce) {
                const twitchAuth = await this.saveTwitchAuth(response, this.nonce);
                this.nonce = '';
            } else {
                throw new Error('Nonce did not match');
            }
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
            const result = await this.databaseService.asyncGet('SELECT * FROM user');
            const refreshToken = await CryptoHelper.decryptString(result.refresh_token);
            const options = {
                method: 'POST',
                url: `https://id.twitch.tv/oauth2/token`,
                form: {
                    client_id: config.twitch.client_id,
                    client_secret: config.twitch.client_secret,
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                },
            };

            const refreshResponse = await Request(options);

            const encryptedRefreshToken = CryptoHelper.encryptString(refreshResponse.refresh_token);
            await this.databaseService.asyncRun('UPDATE test SET refresh_token = ? WHERE username = ?', [encryptedRefreshToken, this.twitchUser.username]);

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
            const options = {
                method: 'GET',
                uri: 'https://id.twitch.tv/oauth2/validate',
                headers: {
                    Authorization: `OAuth ${accessToken}`,
                },
                json: true,
            };

            const validateResponse = await Request(options);
        } catch (err) {
            Logger.Err(err);
            throw err;
        }
    }

    /**
     * Gets the Twitch.tv Authorize URL populated with all parameters.
     */
    public getTwitchAuthUrl(): string {
        if (this.nonce.length === 0) {
            this.nonce = CryptoHelper.generateNonce();
        }

        const TwitchAuthURL =
            `${Constants.TwitchAuthUrl}?`
            + `client_id=${config.twitch.client_id}&`
            + `redirect_uri=${config.twitch.redirect_uri}&`
            + `response_type=code&`
            + `scope=${Constants.TwitchScopes}&`
            + `claims=${Constants.TwitchClaims}&`
            + `nonce=${this.nonce}`;
        return TwitchAuthURL;
    }

    /**
     * Saves the Twitch.tv OAuth refrsh token to a test database and adds the access_token to a cache.
     * @param twitchAuth The response object from https://id.twitch.tv/oauth2/token
     */
    private async saveTwitchAuth(twitchAuth: ITwitchAuthResponse, nonce: string): Promise<any> {
        try {
            const idToken = await CryptoHelper.verifyTwitchJWT(twitchAuth.id_token, nonce);
            const encryptedRefreshToken = CryptoHelper.encryptString(twitchAuth.refresh_token);
            const result = await this.databaseService.asyncRun('INSERT INTO user (refresh_token, id_token, username) VALUES (?, ?, ?)', [encryptedRefreshToken, idToken.sub, idToken.preferred_username]);
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
        if (!accessToken) {
            accessToken = await this.refreshTwitchToken();
        }
        return accessToken;
    }
}

export default OAuthService;
