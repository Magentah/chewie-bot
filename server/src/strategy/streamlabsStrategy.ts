import * as OAuth2Strategy from "passport-oauth2";
import axios from "axios";
import Constants from "../constants";
import { StatusCodes } from "http-status-codes";
import { BotContainer } from "../inversify.config";
import { UserService } from "../services";

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
            case StatusCodes.OK:
                const user: IStreamlabsUser = data as IStreamlabsUser;
                user.accessToken = accessToken;
                done(undefined, user);
                break;
            case StatusCodes.BAD_REQUEST:
            default:
                done(new OAuth2Strategy.InternalOAuthError("Failed to get user profile", undefined));
        }
    }
}

export interface IStreamlabsUser {
    accessToken: string;
    socketToken: string;
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
