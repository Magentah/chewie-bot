export default interface ISocketMessage {
    type: SocketMessageType;
    data: any;
    message: string;
}

export enum SocketMessageType {
    SocketConnected = "SOCKET_CONNECTED",
    BotConnected = "BOT_CONNECTED",
    BotDisconnected = "BOT_DISCONNECTED",
    SongAdded = "SONG_ADDED",
    SongPlayed = "SONG_PLAYED",
    SongRemoved = "SONG_REMOVED",
    SongMovedToTop = "SONG_MOVEDTOTOP",
    SongUpdated = "SONG_UPDATED",
    Subscriber = "SUBSCRIBER",
    AlertTriggered = "ALERT_TRIGGERED",
    PointsChanged = "POINTS_CHANGED",
}
