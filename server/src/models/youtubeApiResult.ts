export interface IYoutubeVideoListResponse {
    kind: string;
    etag: string;
    pageInfo: IYoutubeVideoListResponsePageInfo;
    items: [IYoutubeSong];
}

export interface IYoutubeVideoListResponsePageInfo {
    totalResults: number;
    resultsPerPage: number;
}

export interface IYoutubeSong {
    kind: string;
    etag: string;
    id: string;
    snippet: IYoutubeSongSnippet;
    contentDetails: IYoutubeContentDetails;
}

export interface IYoutubeContentDetails {
    duration: string;
    dimension: string;
    definition: string;
    caption: string;
    licensedContent: boolean;
    hasCustomThumbnail: boolean;
}

export interface IYoutubeSongSnippet {
    publishedAt: Date;
    channelId: string;
    title: string;
    description: string;
    thumbnails: IYoutubeSongSnippetThumnails;
    channelTitle: string;
    tags: [string];
    categoryId: string;
    liveBroadcastContent: string;
    defaultLanguage: string;
    localized: IYoutubeSongSnippetLocalized;
    defaultAudioLanguage: string;
}

export interface IYoutubeSongSnippetLocalized {
    title: string;
    description: string;
}

export interface IYoutubeSongSnippetThumnails {
    [key: string]: IYoutubeSongSnippetThumnail;
}

export interface IYoutubeSongSnippetThumnail {
    url: string;
    width: number;
    height: number;
}

export default IYoutubeSong;
