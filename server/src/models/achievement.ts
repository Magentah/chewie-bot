export enum AchievementType {
    SongRequests = 0,
    Points = 1,
    Songlist = 2,
    UniqueCards = 3,
    Sudoku = 4,
    AnimationRedeems = 5,
    DailyTaxesPaid = 6,
    DuelsWon = 7,
    BankheistPointsWon = 8,
    BankheistPointsLost = 9,
    DailyBitTaxesPaid = 10,
    ArenaWon = 11,
    UniqueCardUpgrades = 12,
    DailyTaxStreak = 13,
    TaxEvasion = 14,
}

export default interface IAchievement {
    id?: number;
    type: number;
    name: string;
    amount: number;
    pointRedemption: number;
    seasonal: boolean;
    imageId: string;
    mimetype?: string;
    announcementMessage?: string;
    creationDate: Date
}
