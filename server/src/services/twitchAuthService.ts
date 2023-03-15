import { injectable } from "inversify";
import { IAccessToken } from "../models";
import * as Config from "../config.json";
import Constants from "../constants";
import axios from "axios";
import moment = require("moment");
import { IUserPrincipal } from "../models/userPrincipal";

export interface ITwitchAuthClientToken {
    accessToken: IAccessToken
    clientId: string,
    // Auth tokens should be invalidated, when API responds with 401 errors.
    // "expires_in" is only max validity.
    invalidate: () => void;
}

export interface ITwitchAuthUserToken extends ITwitchAuthClientToken {
    refreshToken: string
}

@injectable()
export default class TwitchAuthService {
    private clientAccess = new Map<string, ITwitchAuthClientToken>();
    private userAccess = new Map<string, ITwitchAuthUserToken>();

    public async getClientAccessToken(): Promise<ITwitchAuthClientToken> {
        const NoScopes = "";
        return this.getClientAccessTokenWithScopes(NoScopes);
    }

    public async getClientAccessTokenWithScopes(scopes: string): Promise<ITwitchAuthClientToken> {
        const clientId = Config.twitch.clientId;
        const clientSecret = Config.twitch.clientSecret;

        const existingAuth = this.clientAccess.get(scopes);
        if (existingAuth !== undefined && this.isValid(existingAuth)) {
            return existingAuth;
        }

        const { data } = await axios.post(
            `${Constants.TwitchTokenUrl}?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials&scope=${scopes}`
        );

        const result = {
            accessToken: {
                token: data.access_token,
                expiry: moment.now() + data.expires_in * 1000,
            },
            clientId: Config.twitch.clientId,
            invalidate: () => this.clientAccess.delete(scopes)
        };

        this.clientAccess.set(scopes, result);

        return result;
    }

    public async getUserAccessToken(userPrincipal: IUserPrincipal): Promise<ITwitchAuthUserToken> {
        const clientId = Config.twitch.clientId;
        const clientSecret = Config.twitch.clientSecret;

        const existingAuth = this.userAccess.get(userPrincipal.refreshToken);
        if (existingAuth !== undefined && this.isValid(existingAuth)) {
            return existingAuth;
        }

        const { data } = await axios.post(
            `${Constants.TwitchTokenUrl}?client_id=${clientId}&client_secret=${clientSecret}&grant_type=refresh_token&refresh_token=${userPrincipal.refreshToken}`
        );

        const result = {
            accessToken: {
                token: data.access_token,
                expiry: moment.now() + data.expires_in * 1000,
            },
            clientId: Config.twitch.clientId,
            refreshToken: data.refresh_token,
            invalidate: () => this.clientAccess.delete(userPrincipal.refreshToken)
        };

        this.userAccess.set(userPrincipal.refreshToken, result);

        return result;
    }

    public static getMissingPermissions(existingScopes: string | undefined, scopes: string): string[] {
        if (existingScopes !== undefined && existingScopes !== scopes) {
            const current = existingScopes.split(" ");
            const needed = scopes.split(" ");
            const missing = needed.filter(item => current.indexOf(item) < 0);
            return missing;
        }

        return [];
    }

    private isValid(existingAuth: ITwitchAuthClientToken) {
        return new Date(existingAuth.accessToken.expiry) > new Date();
    }
}
