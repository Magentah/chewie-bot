import * as OAuth2Strategy from "passport-oauth2";
import Constants from "../constants";

export enum TwitchAuthorizationLevel {
    Twitch = "twitch",
    TwitchBroadcaster = "twitch-broadcaster",
}

class TwitchStrategy extends OAuth2Strategy {
    constructor(options: OAuth2Strategy.StrategyOptions, verify: OAuth2Strategy.VerifyFunction, authLevel: TwitchAuthorizationLevel) {
        super(options, verify);
        options.authorizationURL = options.authorizationURL || Constants.TwitchAuthUrl;
        options.tokenURL = options.tokenURL || Constants.TwitchTokenUrl;
        options.customHeaders = {
            ...options.customHeaders,
            "Client-ID": options.clientID,
        };

        this._oauth2.setAuthMethod("Bearer");
        this._oauth2.useAuthorizationHeaderforGET(true);
        this.name = authLevel;
    }

    public userProfile(accessToken: string, done: (err?: Error | null | undefined, profile?: any) => void): void {
        this._oauth2.get(`${Constants.TwitchAPIEndpoint}/users`, accessToken, (err, body, res) => {
            if (err) {
                return done(new OAuth2Strategy.InternalOAuthError("Failed to get user profile.", err));
            }

            try {
                const json = JSON.parse(body as string).data[0];
                const profile: ITwitchProfile = {
                    provider: TwitchAuthorizationLevel.Twitch,
                    id: json.id,
                    username: json.login,
                    displayName: json.display_name,
                    profileImageUrl: json.profile_image_url,
                    _raw: body,
                    _json: json,
                };

                done(undefined, profile);
            } catch (e) {
                done(e);
            }
        });
    }

    public authorizationParams(options: any): any {
        if (typeof options.forceVerify !== undefined) {
            return { force_verify: !!options.forceVerify };
        }
        return {};
    }
}

export interface ITwitchProfile {
    provider: string;
    id: number;
    username: string;
    displayName: string;
    profileImageUrl: string;
    _raw: string | Buffer | undefined;
    _json: JSON;
}

export default TwitchStrategy;
