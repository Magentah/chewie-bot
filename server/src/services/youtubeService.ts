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
     * Get the URL to a thumbnail of the video.
     * @param song The song to get the thumbnail for.
     */
    public getSongPreviewUrl(songDetails: IYoutubeSong): string {
        return `https://img.youtube.com/vi/${songDetails.id}/0.jpg`;
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
            const paramIndex = url.indexOf("?");
            if (paramIndex > 0) {
                return url.slice(url.lastIndexOf("/") + 1, paramIndex);
            } else {
                return url.slice(url.lastIndexOf("/") + 1);
            }
        } else if (url.indexOf("youtube") > -1) {
            if (url.indexOf("&") > -1) {
                return url.slice(url.indexOf("?v=") + 3, url.indexOf("&"));
            } else {
                const index = url.indexOf("?v=");
                if (index > 0) {
                    return url.slice(index + 3);
                } else {
                    // Consider https://youtube.com/12345
                    const index = url.lastIndexOf("/");
                    return url.slice(index + 1);
                }
            }
        } else {
            return undefined;
        }
    }
}

export default YoutubeService;
