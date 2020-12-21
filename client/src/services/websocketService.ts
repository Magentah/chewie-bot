type WebsocketCallback = (event: ISocketMessage) => void;

class WebsocketService {
    private websocket: WebSocket | undefined;
    private callbacks: Map<SocketMessageType, WebsocketCallback[]> = new Map();

    constructor() {
        this.connect();
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
        this.websocket?.close();
    }

    private connect() {
        this.websocket = new WebSocket("ws://localhost:8001");
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
            setTimeout(() => this.connect(), 10000);
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
    vipLevelKey?: number;
    vipLevel?: IVIPLevel;
    userLevelKey?: number;
    userLevel?: IUserLevel;
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

interface IUserLevel {
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
    DonationReceived = "DONATION_RECEIVED",
    Subscriber = "SUBSCRIBER",
}

export default WebsocketService;
