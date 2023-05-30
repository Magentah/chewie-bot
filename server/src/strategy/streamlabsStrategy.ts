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

        this._oauth2.setAuthMethod("Bearer");
        this._oauth2.useAuthorizationHeaderforGET(true);
        this.name = Provider.Streamlabs;
    }

    public async userProfile(accessToken: string, done: (err?: Error | null | undefined, profile?: any) => void): Promise<void> {
        this._oauth2.get(`${Constants.StreamlabsAPIEndpoint}/user`, accessToken, (err, body, res) => {
            if (err) {
                return done(new OAuth2Strategy.InternalOAuthError("Failed to get user profile.", err));
            }

            try {
                const user = JSON.parse(body as string) as IStreamlabsUser;
                user.accessToken = accessToken;
                done(undefined, user);
            } catch (e: any) {
                done(e);
            }
        });
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
