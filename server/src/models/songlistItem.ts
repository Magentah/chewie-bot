export default interface ISonglistItem {
    id?: number;
    album: string;
    title: string;
    artist: string;
    genre?: string;
    categoryId: number;
    created?: Date;
    attributedUserId?: number | null;
    songTags?: string | string[]
}

export interface ISonglistCategory {
    id?: number;
    name: string;
    sortOrder: number;
}

export interface ISonglistTag {
    id?: number;
    name: string;
}
