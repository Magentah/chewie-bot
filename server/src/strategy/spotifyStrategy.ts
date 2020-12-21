import * as OAuth2Strategy from "passport-oauth2";
import Constants from "../constants";

class SpotifyStrategy extends OAuth2Strategy {
    constructor(options: OAuth2Strategy.StrategyOptionsWithRequest, verify: OAuth2Strategy.VerifyFunctionWithRequest) {
        super(options, verify);
        options.authorizationURL = options.authorizationURL || Constants.SpotifyAuthUrl;
        options.tokenURL = options.tokenURL || Constants.SpotifyTokenUrl;
        options.scope = options.scope || Constants.SpotifyScopes;

        this._oauth2.useAuthorizationHeaderforGET(false);
        this.name = "spotify";
    }
}

export default SpotifyStrategy;
