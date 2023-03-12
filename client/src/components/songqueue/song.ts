export enum SongSource {
    Youtube = "Youtube",
    Spotify = "Spotify",
}

export default interface Song {
    id: number;
    title: string;
    cleanTitle?: string;
    duration: number;
    requestedBy: string;
    requestSource: string;
    requestSourceDetails: string;
    source: SongSource;
    sourceId: string;
    sourceUrl: string;
    previewUrl: string,
    requestTime: number,
    comments: string
}
