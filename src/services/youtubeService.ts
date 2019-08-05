import { injectable } from 'inversify';
import * as Request from 'request-promise-native';
import config = require('./../config.json');
import Constants from '../constants';
import { IYoutubeSong, IYoutubeVideoListResponse } from '../models/youtubeSong';
import APIResponseParser from '../helpers/apiResponseParser';

@injectable()
export class YoutubeService {
    private apiKey: string = config.youtube.api_key;

    public async getSongDetails(url: string): Promise<IYoutubeSong | undefined> {
        const id = this.parseUrl(url);
        const options = {
            method: 'GET',
            url: Constants.YoutubeVideoUrl,
            qs: {
                part: 'contentDetails,snippet',
                id,
                key: this.apiKey,
            },
        };

        const detailResponse = APIResponseParser.parse<IYoutubeVideoListResponse>(await Request(options));
        if (detailResponse.pageInfo.totalResults > 0) {
            return detailResponse.items[0];
        } else {
            return undefined;
        }
    }

    /**
     * Parses a Youtube URL to get the video ID. This is used in Youtube Data API calls to get details about the video.
     * @param url Youtube URL
     */
    private parseUrl(url: string): string {
        // https://www.youtube.com/watch?v=l0qWjHP1GQc&list=RDl0qWjHP1GQc&start_radio=1

        if (url.indexOf('youtu.be') > -1) {
            // Short Youtube URL
            const id = url.slice(url.lastIndexOf('/'), url.indexOf('?'));
            return id;
        } else if (url.indexOf('youtube') > -1) {
            if (url.indexOf('&') > -1) {
                const id = url.slice(url.indexOf('?v=') + 3, url.indexOf('&'));
                return id;
            } else {
                const id = url.slice(url.indexOf('?v=') + 2);
                return id;
            }
        } else {
            // Not a youtube url.
            throw new Error('URL is not a valid YouTube URL.');
        }
    }
}

export default YoutubeService;
