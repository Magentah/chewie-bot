import moment = require("moment");

export interface ISong {
    id: number;
    details: {
        title: string;
        duration: moment.Duration;
    };
    requestedBy: string;
    requesterStatus: {
        vipStatus: string;
        viewerStatus: string;
    };
    requestSource: RequestSource;
    beenPlayed: boolean;
    source: SongSource;
    sourceId: string;
}

export enum SongSource {
    Youtube = "Youtube",
    Spotify = "Spotify",
}

export enum RequestSource {
    Donation = "Donation",
    Bits = "Bits",
    Subscription = "Subscription",
    Raffle = "Raffle",
    Chat = "Chat",
}

export default ISong;
