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

    public async getSongDetails(id: string): Promise<IYoutubeSong | undefined> {
        const options = {
            params: {
                part: "contentDetails,snippet",
                id,
                key: this.apiKey,
            },
        };

        const detailResponse = await axios.get(
            Constants.YoutubeVideoUrl,
            options
        );
        if (detailResponse.data.pageInfo.totalResults > 0) {
            Logger.info(
                LogType.Youtube,
                `Retrieved details for youtube id ${id} from Youtube Data API`
            );
            return detailResponse.data.items[0];
        } else {
            Logger.err(
                LogType.Youtube,
                `Attempted to get details for invalid youtube id ${id}`
            );
            return undefined;
        }
    }

    public getSongDuration(song: IYoutubeSong): moment.Duration {
        const duration = moment.duration(song.contentDetails.duration);
        return duration;
    }
}

export default YoutubeService;
