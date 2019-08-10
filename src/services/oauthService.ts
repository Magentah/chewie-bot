import { Logger, LogType } from '../logger';
import Constants from './../constants';
import { injectable, inject, id } from 'inversify';
import * as Request from 'request-promise-native';
import Users from './../database/users';
import { CacheService, CacheType } from './cacheService';
import config = require('./../config.json');
import CryptoHelper from '../helpers/cryptoHelper';
import { ITwitchAuthResponse, ITwitchRedirectResponse, ITwitchUser } from '../models/twitchApi';
import UserLevels, { IUserLevel } from '../database/userLevels';
import VIPLevels from '../database/vipLevels';

// Twitch OAuth is for logging in users through the front end. For the chatbot oauth, we should be using https://twitchapps.com/tmi/ with the bot account login.
@injectable()
class OAuthService {
    // Populated immediately after authenticating with Twitch
    private nonce: string = '';

    constructor(@inject(Users) private users: Users, @inject(UserLevels) private userLevels: UserLevels, @inject(VIPLevels) private vipLevels: VIPLevels,  @inject(CacheService) private cacheService: CacheService) {
        // Empty
    }

    /**
     * Gets an oauth token from Twitch.tv
     * @param authResponse Response object from https://id.twitch.tv/oauth2/authorize
     */
    public async getTwitchAuthToken(authResponse: ITwitchRedirectResponse): Promise<ITwitchUser> {
        return new Promise<ITwitchUser>(async (resolve, reject) => {
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
                    Logger.err(LogType.OAuth, `Nonce did not match. Expected: ${this.nonce} -- Got: ${response.nonce}`);
                    this.nonce = '';
                    reject(`Nonce did not match.`);
                }
            } catch (err) {
                Logger.err(LogType.OAuth, err);
                this.nonce = '';
                reject(err);
            }
        });
    }

    /**
     * Refresh the OAuth access token for a user.
     * @param username The username to refresh the access token for.
     */
    public async refreshTwitchToken(username: string): Promise<string> {
        Logger.info(LogType.OAuth, 'Refreshing Twitch.tv OAuth token.');

        try {
            // Get refresh token from test database. Only a single user in single table, so just select everything.
            const user = await this.users.get(username);
            const refreshToken = CryptoHelper.decryptString(user.refreshToken);
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
            user.refreshToken = encryptedRefreshToken;
            await this.users.update(user);

            // Cache the access token. Default set to 60s TTL. We should be using the refresh token to get a new access token every 30-60s.
            this.cacheService.set(CacheType.OAuth, `${Constants.TwitchCacheAccessToken}.${username}`, refreshResponse.access_token);
            return refreshResponse.access_token;
        } catch (err) {
            Logger.err(LogType.OAuth, err);
            throw err;
        }
    }

    /**
     * Verifies the Twitch.tv OAuth token for a user.
     * @param username The username to verify the OAuth token for.
     */
    public async verifyTwitchOauth(username: string): Promise<boolean> {
        Logger.info(LogType.OAuth, 'Verifying OAuth token');

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
            return true;    // If request is successful, verification was a success
        } catch (err) {
            Logger.err(LogType.OAuth, err);
            return false;
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

                let user = await this.users.get(idToken.preferred_username);
                if (user) {
                    user.refreshToken = encryptedRefreshToken;
                    await this.users.update(user);
                } else {
                    // hacky for now
                    let userLevel: IUserLevel;
                    if (idToken.preferred_username.toLowerCase() === 'magentafall') {
                        userLevel = await this.userLevels.get('Broadcaster');
                    } else {
                        userLevel = await this.userLevels.get('Viewer');   // TODO: Change to constant
                    }
                    const vipLevel = await this.vipLevels.get('None');  // TODO: Change to constant
                    user = {
                        username: idToken.preferred_username,
                        idToken: idToken.sub,
                        refreshToken: encryptedRefreshToken,
                        points: 0,
                        vipExpiry: undefined,
                        userLevelKey: userLevel.id,
                        vipLevelKey: vipLevel.id,
                    };
                    await this.users.add(user);
                }
                this.cacheService.set(CacheType.OAuth, `${Constants.TwitchCacheAccessToken}.${idToken.preferred_username}`, twitchAuth.access_token);
                resolve({
                    id: idToken.sub,
                    username: idToken.preferred_username,
                });

            } catch (err) {
                Logger.err(LogType.OAuth, err);
                reject(err);
            }
        });
    }

    /**
     * Gets a Twitch.tv OAuth token for a user from the cache. If the TTL has expired, refreshes the access token before returning.
     * @param username The username to get the access token for.
     */
    private async getTwitchAccessToken(username: string): Promise<string> {
        let accessToken = this.cacheService.get(CacheType.OAuth, `${Constants.TwitchCacheAccessToken}.${username}`);
        if (!accessToken) {
            accessToken = await this.refreshTwitchToken(username);
        }
        return accessToken;
    }
}

export default OAuthService;
