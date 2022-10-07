import { UserLevels } from "../contexts/userContext";

type WebsocketCallback = (event: ISocketMessage) => void;

class WebsocketService {
    private websocket: WebSocket | undefined;
    private callbacks: Map<SocketMessageType, WebsocketCallback[]> = new Map();
    private isClosed = false;

    constructor(hostname: string, protocol: string) {
        this.connect(hostname, protocol);
    }

    public onMessage(type: SocketMessageType, callback: WebsocketCallback): void {
        if (this.callbacks.has(type)) {
            const current: WebsocketCallback[] = this.callbacks.get(type) ?? [];
            this.callbacks.set(type, [...current, callback]);
        } else {
            this.callbacks.set(type, [callback]);
        }
    }

    public close(): void {
        this.isClosed = true;
        this.websocket?.close();
    }

    private connect(hostname: string, protocol: string) {
        switch (protocol.toLowerCase()) {
            case "https:": {
                this.websocket = new WebSocket(`wss://${hostname}/ws/`);
                break;
            }
            default: {
                this.websocket = new WebSocket(`ws://${hostname}:8001`);
                break;
            }
        }
        this.websocket.onopen = () => {
            console.log("connected to websocket");
        };

        this.websocket.onmessage = (message: MessageEvent) => {
            console.log("websocket message");
            const msg: ISocketMessage = JSON.parse(message.data);
            if (msg.type) {
                const callbacks = this.callbacks.get(msg.type) ?? [];
                this.processMessage(msg, callbacks);
            }
        };
        this.websocket.onclose = () => {
            console.log("disconnected from websocket");
            if (!this.isClosed) {
                setTimeout(() => this.connect(hostname, protocol), 10000);
            }
        };
        this.websocket.onerror = (event: Event) => {
            console.log("websocket error");
            console.log(event);
        };
    }

    private processMessage(message: ISocketMessage, callbacks: WebsocketCallback[]): void {
        callbacks.forEach((callback: WebsocketCallback) => {
            callback(message);
        });
    }
}

export interface ISocketMessage {
    type: SocketMessageType;
    data: any;
    message: string;
    user?: IUser;
    username?: string;
}

interface IUser {
    id?: number;
    username: string;
    idToken?: string;
    refreshToken?: string;
    points: number;
    vipExpiry?: Date;
    vipLastRequest?: Date;
    vipLevelKey?: number;
    vipLevel?: IVIPLevel;
    userLevel?: UserLevels;
    hasLogin: boolean;
    streamlabsToken?: string;
    streamlabsRefresh?: string;
    spotifyRefresh?: string;
}

interface IVIPLevel {
    id?: number;
    name: string;
    rank: number;
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

export default WebsocketService;
