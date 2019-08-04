export interface ITwitchAuthResponse {
    access_token: string;
    expires_in: string;
    refresh_token: string;
    scope: string[];
    token_type: string;
    id_token: string;
}

export interface ITwitchRedirectResponse {
    code: string;
    scope: string;
}

export interface ITwitchIDToken {
    // Token Issuer (twitch)
    iss: string;
    // Subject (user id)
    sub: string;
    // OAuth client this token is intended for (client_id)
    aud: string;
    // Expiration time
    exp: number;
    // Issuance time
    iat: number;
    // Nonce if provided
    nonce: string;
    // Additional claim for preferred username.
    preferred_username: string;
}