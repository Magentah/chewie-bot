export interface ISpotifyArtist {
    external_urls: ISpotifyExternalUrls;
    href: string;
    id: string;
    name: string;
    type: string;
    uri: string;
}

export interface ISpotifyImage {
    height: number;
    url: string;
    width: number;
}

export interface ISpotifyAlbum {
    album_type: string;
    artists: ISpotifyArtist[];
    available_markets: string[];
    external_urls: ISpotifyExternalUrls;
    href: string;
    id: string;
    images: ISpotifyImage[];
    name: string;
    release_date: string;
    release_date_precision: string;
    type: string;
    uri: string;
}

export interface ISpotifyArtist {
    external_urls: ISpotifyExternalUrls;
    href: string;
    id: string;
    name: string;
    type: string;
    uri: string;
}

export interface ISpotifyExternalIds {
    isrc: string;
}

export interface ISpotifyExternalUrls {
    spotify: string;
}

export interface ISpotifySong {
    album: ISpotifyAlbum;
    artists: ISpotifyArtist[];
    available_markets: string[];
    disc_number: number;
    duration_ms: number;
    explicit: boolean;
    external_ids: ISpotifyExternalIds;
    external_urls: ISpotifyExternalUrls;
    href: string;
    id: string;
    is_local: boolean;
    name: string;
    popularity: number;
    preview_url: string;
    track_number: number;
    type: string;
    uri: string;
}

export default ISpotifySong;
