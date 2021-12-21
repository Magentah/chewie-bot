export enum SongSource {
    Youtube = "Youtube",
    Spotify = "Spotify",
}

export default interface Song {
    id: number,
    previewData: {
        previewUrl: string,
        linkUrl: string
    },
    details: {
        title: string;
        duration: moment.Duration;
        sourceId: string;
        source: SongSource;
    };
    source: number;
    sourceId: string;
    duration: moment.Duration;
    requestedBy: string;
    requesterStatus: {
        viewerStatus: string;
        vipStatus: string;
    };
    requestSource: string;
    requestTime: number;
    comments: string;
}
