import moment = require("moment");

export interface ISong {
    id?: number;
    title: string;
    duration: moment.Duration;
    requestedBy: string;
    requestSource: RequestSource;
    source: SongSource;
    sourceId: string;
    sourceUrl: string;
    previewUrl: string,
    requestTime: number,
    comments: string
}

export interface IArchivedSong {
    title: string;
    requestedBy: string;
    requestSource: RequestSource;
    songSource: SongSource;
    url: string;
    previewUrl: string;
    duration: number;
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
    ChannelPoints = "ChannelPoints"
}

export default ISong;
