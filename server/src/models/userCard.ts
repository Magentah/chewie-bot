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
    setName?: string;
    rarity: CardRarity;
    creationDate: Date
}
