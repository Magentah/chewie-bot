import * as OAuth2Strategy from "passport-oauth2";
import Constants from "../constants";

class DropboxStrategy extends OAuth2Strategy {
    constructor(options: OAuth2Strategy.StrategyOptionsWithRequest, verify: OAuth2Strategy.VerifyFunctionWithRequest) {
        super(options, verify);
        options.authorizationURL = options.authorizationURL || Constants.DropboxAuthUrl;
        options.tokenURL = options.tokenURL || Constants.DropboxTokenUrl;

        this._oauth2.useAuthorizationHeaderforGET(false);
        this.name = "dropbox";
    }

    public async userProfile(accessToken: string, done: (err?: Error | null | undefined, profile?: any) => void): Promise<void> {
        done(undefined, { accessToken });
    }
}

export default DropboxStrategy;
