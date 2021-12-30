import moment = require("moment");

export interface ISong {
    id: number;
    details: {
        title: string;
        duration: moment.Duration;
        sourceId: string,
        source: SongSource
    };
    requestedBy: string;
    requesterStatus: {
        vipStatus: string;
        viewerStatus: string;
    };
    requestSource: RequestSource;
    source: SongSource;
    sourceId: string;
    sourceUrl: string;
    previewData: {
        previewUrl: string,
        linkUrl: string
    },
    requestTime: number,
    comments: string
}

export enum SongSource {
    Youtube = "Youtube",
    Spotify = "Spotify",
    Unknown = "Unknown",
}

export enum RequestSource {
    Donation = "Donation",
    Bits = "Bits",
    Subscription = "Subscription",
    Raffle = "Raffle",
    Chat = "Chat",
    GoldSong = "GoldSong",
}

export default ISong;
