import IUser from "./user";

export default interface ISocketMessage {
    type: SocketMessageType;
    data: any;
    message: string;
    user?: IUser;
    username?: string;
}

export enum SocketMessageType {
    SocketConnected = "SOCKET_CONNECTED",
    BotConnected = "BOT_CONNECTED",
    BotDisconnected = "BOT_DISCONNECTED",
    SongAdded = "SONG_ADDED",
    SongPlayed = "SONG_PLAYED",
    SongRemoved = "SONG_REMOVED",
    SongMovedToTop = "SONG_MOVEDTOTOP",
    DonationReceived = "DONATION_RECEIVED",
    Subscriber = "SUBSCRIBER",
    AlertTriggered = "ALERT_TRIGGERED",
}
