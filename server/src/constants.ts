export default class Constants {
    // Twitch
    public static readonly TwitchAuthUrl = "https://id.twitch.tv/oauth2/authorize";
    public static readonly TwitchTokenUrl = "https://id.twitch.tv/oauth2/token";
    public static readonly TwitchScopes =
        "channel:moderate chat:read chat:edit whispers:read whispers:edit channel:read:subscriptions channel:read:redemptions channel:manage:extensions moderation:read";
    public static readonly TwitchClaims =
        // tslint:disable-next-line: quotemark
        '{"id_token":{"email_verified":null}, "userinfo":{"preferred_username"}}';
    public static readonly TwitchCacheAccessToken = "oauth.twitch.accessToken";
    public static readonly TwitchJWKUri = "https://id.twitch.tv/oauth2/keys";
    public static readonly TwitchAPIEndpoint = "https://api.twitch.tv/helix";
    public static readonly TwitchEventSubEndpoint = "https://api.twitch.tv/helix/eventsub/subscriptions";
    public static readonly TwitchUri = "https://www.twitch.tv";

    // Streamlabs
    public static readonly StreamlabsAuthUrl = "https://streamlabs.com/api/v1.0/authorize";
    public static readonly StreamlabsTokenUrl = "https://streamlabs.com/api/v1.0/token";
    public static readonly StreamlabsScopes = "donations.read socket.token";
    public static readonly StreamlabsAPIEndpoint = "https://streamlabs.com/api/v1.0";
    public static readonly StreamlabsSocketEndpoint = "https://sockets.streamlabs.com";

    // Youtube
    public static readonly YoutubeVideoUrl = "https://www.googleapis.com/youtube/v3/videos";

    // Spotify
    public static readonly SpotifyAuthUrl = "https://accounts.spotify.com/authorize";
    public static readonly SpotifyTokenUrl = "https://accounts.spotify.com/api/token";
    public static readonly SpotifyTracksUrl = "https://api.spotify.com/v1/tracks";
    public static readonly SpotifyScopes = "streaming user-read-email user-modify-playback-state user-read-private";
}
