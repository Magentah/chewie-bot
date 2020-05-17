import moment = require('moment');

export interface ISong {
    id: number;
    title: string;
    duration: moment.Duration;
    requestedBy: string;
    beenPlayed: boolean;
    source: SongSource;
    sourceId: string;
}

export enum SongSource {
    Youtube,
}

export default ISong;
