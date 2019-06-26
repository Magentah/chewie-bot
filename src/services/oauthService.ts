import { Logger } from '@overnightjs/logger';
import Constants from './../constants';
import { injectable } from 'inversify';
import * as Request from 'request-promise-native';
import * as sqlite from 'sqlite3';
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
    private testDB: sqlite.Database;
    constructor() {
        // Empty
        this.testDB = new sqlite.Database('test.db', (err) => {
            if (err) {
                Logger.Err(err);
            }
        });
        this.testDB.run('CREATE TABLE if not exists test(id integer primary key, access_token text)');
    }

    public getTwitchAuthToken(authResponse: ITwitchRedirectResponse): Promise<any> {
        return new Promise((resolve, reject) => {
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
            .then((response) => {
                this.saveTwitchAuth(response)
                .then((result) => resolve());
            })
            .catch((err) => {
                Logger.Err(err);
                reject(err);
            });
        });
    }

    public getTwitchUserInfo(): Promise<any> {
        return new Promise((resolve, reject) => {
            Logger.Info('Getting Twitch User Info');
            let twitchAuthToken = null;
            this.testDB.get('SELECT * FROM test', [], (err, row) => {
                if (err) {
                    Logger.Err(err);
                    reject(err);
                }

                Logger.Info(row.access_token);
                twitchAuthToken = row.access_token;

                const options = {
                    method: 'GET',
                    uri: 'https://id.twitch.tv/oauth2/userinfo',
                    headers: {
                        Authorization: `Bearer ${twitchAuthToken}`,
                    },
                    json: true,
                };

                Logger.Info(options.headers.Authorization);
                Request(options).then((response) => {
                    Logger.Info(JSON.stringify(response));
                    resolve();
                })
                .catch((reqErr) => {
                    Logger.Err(reqErr);
                    reject(reqErr);
                });
            });
        });
    }

    public getTwitchAuthUrl(): string {
        const TwitchAuthURL = `${Constants.TwitchAuthUrl}?client_id=${config.twitch.client_id}&redirect_uri=${config.twitch.redirect_uri}&response_type=code&scope=${Constants.TwitchScopes}&claims=${Constants.TwitchClaims}`;
        return TwitchAuthURL;
    }

    private saveTwitchAuth(twitchAuth: ITwitchAuthResponse): Promise<any> {
        return new Promise((resolve, reject) => {
            Logger.Info(`Saving Twitch Access Token: ${twitchAuth.access_token}`);
            this.testDB.run('INSERT INTO test(access_token) VALUES(?)', [twitchAuth.access_token], (err) => {
                if (err) {
                    Logger.Err(err);
                    return reject();
                }

                Logger.Info(`Added access_token ${twitchAuth.access_token} to test database`);
                return resolve();
            });
        });
    }
}

export default OAuthService;
