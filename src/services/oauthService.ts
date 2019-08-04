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
import { ITwitchAuthResponse, ITwitchRedirectResponse, ITwitchIDToken, ITwitchCacheValue, ITwitchUser } from '../models/twitchApi';

// Twitch OAuth is for logging in users through the front end. For the chatbot oauth, we should be using https://twitchapps.com/tmi/ with the bot account login.

@injectable()
class OAuthService {
    // Populated immediately after authenticating with Twitch
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
    public async getTwitchAuthToken(authResponse: ITwitchRedirectResponse): Promise<ITwitchUser> {
        return new Promise<any>(async (resolve, reject) => {
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
                if (response.nonce.replace(new RegExp(' ', 'g'), '+') === this.nonce) {
                    const twitchAuth = await this.saveTwitchAuth(response, this.nonce);
                    this.nonce = '';
                    resolve(twitchAuth);
                } else {
                    Logger.Err(`Nonce did not match. Expected: ${this.nonce} -- Got: ${response.nonce}`);
                    this.nonce = '';
                    reject(`Nonce did not match. Expected: ${this.nonce} -- Got: ${response.nonce}`);
                }
            } catch (err) {
                Logger.Err(err);
                this.nonce = '';
                reject(err);
            }
        });
    }

    public async refreshTwitchToken(username: string): Promise<string> {
        Logger.Info('Refreshing Twitch.tv OAuth token.');

        try {
            // Get refresh token from test database. Only a single user in single table, so just select everything.
            const result = await this.databaseService.asyncGet('SELECT * FROM user WHERE username = ?', [username]);
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
            await this.databaseService.asyncRun('UPDATE test SET refresh_token = ? WHERE username = ?', [encryptedRefreshToken, username]);

            // Cache the access token. Default set to 60s TTL. We should be using the refresh token to get a new access token every 30-60s.
            await this.cacheService.set(CacheType.OAuth, `${Constants.TwitchCacheAccessToken}.${username}`, refreshResponse.access_token);
            return refreshResponse.access_token;
        } catch (err) {
            Logger.Err(err);
            throw err;
        }
    }

    /**
     * Verifies the Twitch.tv OAuth token.
     */
    public async verifyTwitchOauth(username: string): Promise<any> {
        Logger.Info('Verifying OAuth token');

        try {
            const accessToken = await this.getTwitchAccessToken(username);
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
    private async saveTwitchAuth(twitchAuth: ITwitchAuthResponse, nonce: string): Promise<ITwitchUser> {
        return new Promise<ITwitchUser>(async (resolve, reject) => {
            try {
                const idToken = await CryptoHelper.verifyTwitchJWT(twitchAuth.id_token, nonce);
                const encryptedRefreshToken = CryptoHelper.encryptString(twitchAuth.refresh_token);

                const userExists = await this.databaseService.asyncGet('SELECT * FROM user WHERE id_token = ?', [idToken.sub]);
                if (userExists) {
                    const result = await this.databaseService.asyncRun('UPDATE user SET refresh_token = ? WHERE id_token = ?', [encryptedRefreshToken, idToken.sub]);
                } else {
                    const result = await this.databaseService.asyncRun('INSERT INTO user (refresh_token, id_token, username) VALUES (?, ?, ?)', [encryptedRefreshToken, idToken.sub, idToken.preferred_username]);
                }
                this.cacheService.set(CacheType.OAuth, `${Constants.TwitchCacheAccessToken}.${idToken.preferred_username}`, twitchAuth.access_token);
                resolve({
                    id: idToken.sub,
                    username: idToken.preferred_username,
                });

            } catch (err) {
                Logger.Err(err);
                reject(err);
            }
        });
    }

    /**
     * Gets the Twitch.tv OAuth token from the cache. If the TTL has expired, refreshes the access token before returning.
     */
    private async getTwitchAccessToken(username: string): Promise<string> {
        let accessToken = await this.cacheService.get(CacheType.OAuth, `${Constants.TwitchCacheAccessToken}.${username}`);
        if (!accessToken) {
            accessToken = await this.refreshTwitchToken(username);
        }
        return accessToken;
    }
}

export default OAuthService;
