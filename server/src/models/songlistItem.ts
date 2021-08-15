export default interface ISonglistItem {
    id?: number;
    album: string;
    title: string;
    artist: string;
    genre: string;
    categoryId: number;
    created?: Date;
    attributedUserId?: number | null
}

export interface ISonglistCategory {
    id?: number;
    name: string;
    sortOrder: number;
}
