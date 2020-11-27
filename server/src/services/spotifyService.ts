import axios from "axios";
import { injectable } from "inversify";
import * as moment from "moment";
import ISpotifySong from "../models/spotifyApiResult";
import * as Config from "../config.json";
import Constants from "../constants";
import { Logger, LogType } from "../logger";
import qs = require("qs");

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
            return url.slice(index + token.length);
        } else {
            return undefined;
        }
    }
}

export default SpotifyService;
