export enum GameEventType {
    Bankheist = "bankheist"
}

export enum GameMessageType {
    NoWin = "no-win",
    AllWin = "all-win",
    SomeWin = "34-percent-win",
    SingleWin = "single-win",
    SingleLose = "single-lose",
    BankNameLevel1 = "bank-level-1",
    BankNameLevel2 = "bank-level-2",
    BankNameLevel3 = "bank-level-3",
    BankNameLevel4 = "bank-level-4",
    BankNameLevel5 = "bank-level-5",
}

export default interface IGameMessage {
    id?: number;
    type: GameMessageType;
    text: string;
    eventType: GameEventType;
}
