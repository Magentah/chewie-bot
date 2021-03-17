export enum ProviderType {
    Twitch,
    Streamlabs,
    Youtube,
    Spotify
}

export interface IUserPrincipal {
    username: string;
    accessToken: string;
    refreshToken: string;
    providerType: ProviderType;
}