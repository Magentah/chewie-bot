export enum CardRarity {
    Common = 0,
    Uncommon = 1,
    Rare = 2,
    Mythical = 3,
    Legendary = 4
}

export default interface IUserCard {
    id?: number;
    name: string;
    imageId: string;
    mimetype?: string;
    setName?: string;
    baseCardName?: string;
    rarity: CardRarity;
    isUpgrade: boolean;
    creationDate: Date;
    isEnabled: boolean;
}

export interface IUserCardOnStackInfo extends IUserCard {
    cardCount: number;
    upgradedName?: string;
    upgradedImagId?: string;
    upgradedMimeType?: string;
}
