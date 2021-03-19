import { injectable } from "inversify";
import { IAccessToken } from "../models";

import * as Config from "../config.json";
import Constants from "../constants";
import axios from "axios";
import moment = require("moment");
import { IUserPrincipal } from "../models/userPrincipal";

@injectable()
export default class TwitchAuthService {
    public async getClientAccessToken(scopes: string): Promise<{accessToken: IAccessToken, clientId: string}> {
        const clientId = Config.twitch.clientId;
        const clientSecret = Config.twitch.clientSecret;
        const { data } = await axios.post(
            `${Constants.TwitchTokenUrl}?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials&scope=${scopes}`
        );

        return {
            accessToken: {
                token: data.access_token,
                expiry: moment.now() + data.expires_in,
            },
            clientId: Config.twitch.clientId
        };
    }

    public async getUserAccessToken(userPrincipal: IUserPrincipal): Promise<{accessToken: IAccessToken, clientId: string, refreshToken: string}> {
        const clientId = Config.twitch.clientId;
        const clientSecret = Config.twitch.clientSecret;
        const { data } = await axios.post(
            `${Constants.TwitchTokenUrl}?client_id=${clientId}&client_secret=${clientSecret}&grant_type=refresh_token&refresh_token=${userPrincipal.refreshToken}`
        );

        return {
            accessToken: {
                token: data.access_token,
                expiry: moment.now() + data.expires_in,
            },
            clientId: Config.twitch.clientId,
            refreshToken: data.refresh_token
        };
    }
}
