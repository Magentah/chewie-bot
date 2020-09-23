import * as OAuth2Strategy from "passport-oauth2";
import axios from "axios";
import Constants from "../constants";
import { OK, BAD_REQUEST } from "http-status-codes";
import { BotContainer } from "../inversify.config";
import UserService from "../services/userService";

enum Provider {
    Streamlabs = "streamlabs",
}

class StreamlabsStrategy extends OAuth2Strategy {
    constructor(options: OAuth2Strategy.StrategyOptionsWithRequest, verify: OAuth2Strategy.VerifyFunctionWithRequest) {
        super(options, verify);
        options.authorizationURL = options.authorizationURL || Constants.StreamlabsAuthUrl;
        options.tokenURL = options.tokenURL || Constants.StreamlabsTokenUrl;
        options.scope = options.scope || Constants.StreamlabsScopes;

        this._oauth2.useAuthorizationHeaderforGET(false);
        this.name = Provider.Streamlabs;
    }

    public async userProfile(
        accessToken: string,
        done: (err?: Error | null | undefined, profile?: any) => void
    ): Promise<void> {
        const { data, status } = await axios.get(`${Constants.StreamlabsAPIEndpoint}/user`, {
            params: {
                access_token: accessToken,
            },
        });
        switch (status) {
            case OK:
                const user: IStreamlabsUser = data as IStreamlabsUser;
                if (user.twitch.name) {
                    const existingUser = await BotContainer.get(UserService).getUser(user.twitch.name);
                    done(undefined, existingUser);
                }
                break;
            case BAD_REQUEST:
            default:
                done(new OAuth2Strategy.InternalOAuthError("Failed to get user profile", undefined));
        }
    }
}

interface IStreamlabsUser {
    streamlabs: {
        id?: number;
        display_name?: string;
    };
    twitch: {
        id?: number;
        display_name?: string;
        name?: string;
    };
    youtube: {
        id?: string;
        title?: string;
    };
    facebook: {
        id?: string;
        name?: string;
    };
}

export default StreamlabsStrategy;
