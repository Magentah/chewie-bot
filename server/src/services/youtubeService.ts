import { injectable } from "inversify";
import * as Request from "request-promise-native";
import Constants from "../constants";
import { IYoutubeSong, IYoutubeVideoListResponse } from "../models/youtubeApiResult";
import APIResponseParser from "../helpers/apiResponseParser";
import * as moment from "moment";
import Logger, { LogType } from "../logger";

import * as Config from "../config.json";

@injectable()
export class YoutubeService {
    private apiKey: string = Config.youtube.apiKey;

    public async getSongDetails(id: string): Promise<IYoutubeSong | undefined> {
        const options = {
            method: "GET",
            url: Constants.YoutubeVideoUrl,
            qs: {
                part: "contentDetails,snippet",
                id,
                key: this.apiKey,
            },
        };

        const detailResponse = APIResponseParser.parse<IYoutubeVideoListResponse>(await Request(options));
        if (detailResponse.pageInfo.totalResults > 0) {
            Logger.info(LogType.Youtube, `Retrieved details for youtube id ${id} from Youtube Data API`);
            return detailResponse.items[0];
        } else {
            Logger.err(LogType.Youtube, `Attempted to get details for invalid youtube id ${id}`);
            return undefined;
        }
    }

    public getSongDuration(song: IYoutubeSong): moment.Duration {
        const duration = moment.duration(song.contentDetails.duration);
        return duration;
    }
}

export default YoutubeService;
