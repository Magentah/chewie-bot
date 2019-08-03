export interface ISong {
    id: string;
    title: string;
    duration: string;
    requestedBy: string;
    beenPlayed: boolean;
    source: SongSource;
}

export enum SongSource {
    Youtube,
}

export default ISong;
