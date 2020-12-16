import axios from "axios";
import { injectable } from "inversify";
import * as moment from "moment";
import ISpotifySong from "../models/spotifyApiResult";
import * as Config from "../config.json";
import Constants from "../constants";
import { Logger, LogType } from "../logger";
import qs = require("qs");
import { IUser } from "../models";

@injectable()
export class SpotifyService {
    private clientId: string = Config.spotify.clientId;
    private clientSecret: string = Config.spotify.clientSecret;

    /**
     * Get the video details for an id from the Spotify API.
     * @param id The Spotify API of the video
     */
    public async getSongDetails(id: string): Promise<ISpotifySong | undefined> {
        const base64Auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
        const postData = qs.stringify({ grant_type: "client_credentials" });
        const authOptions = {
            headers: { "Authorization": "Basic " + base64Auth, "content-type": "application/x-www-form-urlencoded" }
        };
        const authResponse = await axios.post(Constants.SpotifyTokenUrl, postData, authOptions);
        const accessToken = authResponse.data.access_token;
        if (!accessToken) {
            Logger.err(LogType.Spotify, `Spotify access token could not be retrieved.`);
            return undefined;
        }

        const options = {
            headers: { Authorization: "Bearer " + accessToken},
        };

        const detailResponse = await axios.get(Constants.SpotifyTracksUrl + "/" + id, options);
        if (detailResponse.data.name) {
            Logger.info(LogType.Youtube, `Retrieved details for spotify id ${id} from Spotify API`);
            return detailResponse.data;
        } else {
            Logger.err(LogType.Youtube, `Attempted to get details for invalid Spotify id ${id}`);
            return undefined;
        }
    }

    /**
     * Gets a new access token using the refresh token from the Spotify authorization service.
     * May also receive a new refresh token.
     * @param user User to get new refresh token for.
     */
    public async getNewAccessToken(user: IUser): Promise<{accessToken: string, newRefreshToken?: string}> {
        if (!user.spotifyRefresh) {
            return { accessToken: "" };
        }

        const base64Auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
        const refreshToken = user.spotifyRefresh;
        const authOptions = {
            headers: { "Authorization": "Basic " + base64Auth, "content-type": "application/x-www-form-urlencoded" }
        };

        const postData = qs.stringify({ grant_type: "refresh_token", refresh_token: refreshToken });

        const authResponse = await axios.post(Constants.SpotifyTokenUrl, postData, authOptions);
        if (authResponse.data) {
            // Save potential new refresh token
            if (authResponse.data.refresh_token) {
                return { accessToken: authResponse.data.access_token, newRefreshToken: authResponse.data.refresh_token };
            }

            return { accessToken: authResponse.data.access_token };
        }
        
        return { accessToken: "" };
    }

    /**
     * Get the URL to a thumbnail of the video.
     * @param song The song to get the thumbnail for.
     */
    public getSongPreviewUrl(songDetails: ISpotifySong): string {
        if (songDetails.album) {
            // Use first image smaller than 600 px
            for (const img of songDetails.album.images) {
                if (img.height < 600) {
                    return img.url;
                }
            }
        }

        return "";
    }

    /**
     * Get the duration of a song from spotify
     * @param song The song to get the duration for.
     */
    public getSongDuration(song: ISpotifySong): moment.Duration {
        const duration = moment.duration(song.duration_ms);
        return duration;
    }

    /**
     * Parses a spotify url to get the song id used in api queries.
     * @param url The url to parse
     * @example https://open.spotify.com/track/1GCy5g91naGnJ1WJJhI88m
     */
    public parseSpotifyUrl(url: string): string | undefined {
        const token = "spotify.com/track/";
        const index = url.indexOf(token);
        if (index > -1) {
            // Cut off any parameters attached to the URL
            const indexParams = url.indexOf("?", index);
            const startIndex = index + token.length;
            if (indexParams > 0) {
                return url.slice(startIndex, indexParams);
            } else {
                return url.slice(startIndex);
            }            
        } else {
            return undefined;
        }
    }
}

export default SpotifyService;
