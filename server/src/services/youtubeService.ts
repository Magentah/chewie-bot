import axios from "axios";
import { injectable } from "inversify";
import * as moment from "moment";
import * as Config from "../config.json";
import Constants from "../constants";
import { Logger, LogType } from "../logger";
import { IYoutubeSong } from "../models/youtubeApiResult";

@injectable()
export class YoutubeService {
    private apiKey: string = Config.youtube.apiKey;

    /**
     * Get the video details for an id from the Youtube API.
     * @param id The Youtube API of the video
     */
    public async getSongDetails(id: string): Promise<IYoutubeSong | undefined> {
        const options = {
            params: {
                part: "contentDetails,snippet",
                id,
                key: this.apiKey,
            },
        };

        const detailResponse = await axios.get(Constants.YoutubeVideoUrl, options);
        if (detailResponse.data.pageInfo.totalResults > 0) {
            Logger.info(LogType.Youtube, `Retrieved details for youtube id ${id} from Youtube Data API`);
            return detailResponse.data.items[0];
        } else {
            Logger.err(LogType.Youtube, `Attempted to get details for invalid youtube id ${id}`);
            return undefined;
        }
    }

    /**
     * Get the duration of a song from youtube
     * @param song The song to get the duration for.
     */
    public getSongDuration(song: IYoutubeSong): moment.Duration {
        const duration = moment.duration(song.contentDetails.duration);
        return duration;
    }

    /**
     * Parses a youtube url to get the video id used in youtube api queries.
     * @param url The url to parse
     */
    public parseYoutubeUrl(url: string): string | undefined {
        if (url.indexOf("youtu.be") > -1) {
            // Short Youtube URL
            const id = url.slice(url.lastIndexOf("/"), url.indexOf("?"));
            return id;
        } else if (url.indexOf("youtube") > -1) {
            if (url.indexOf("&") > -1) {
                return url.slice(url.indexOf("?v=") + 3, url.indexOf("&"));
            } else {
                return url.slice(url.indexOf("?v=") + 3);
            }
        } else {
            return undefined;
        }
    }
}

export default YoutubeService;
