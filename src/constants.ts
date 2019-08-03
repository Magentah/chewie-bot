export default class Constants {
    public static readonly TwitchAuthUrl = 'https://id.twitch.tv/oauth2/authorize';
    public static readonly TwitchScopes = 'channel:moderate chat:read chat:edit whispers:read whispers:edit';
    public static readonly TwitchClaims = '{"id_token":{"email_verified":null}, "userinfo":{"preferred_username"}}';
    public static readonly TwitchCacheAccessToken = 'oauth.twitch.accessToken';

    public static readonly YoutubeVideoUrl = 'https://www.googleapis.com/youtube/v3/videos';
}
