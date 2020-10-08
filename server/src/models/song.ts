import moment = require("moment");

export interface ISong {
    id: number;
    title: string;
    duration: moment.Duration;
    requestedBy: string;
    requestSource: RequestSource;
    beenPlayed: boolean;
    source: SongSource;
    sourceId: string;
}

export enum SongSource {
    Youtube,
}

export enum RequestSource {
    Donation,
    Bits,
    Subscription,
    Raffle,
}

export default ISong;
