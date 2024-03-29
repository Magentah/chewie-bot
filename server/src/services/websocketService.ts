import * as WebSocket from "ws";
import { ClientRequest, IncomingMessage } from "http";
import { Logger, LogType } from "../logger";
import { injectable } from "inversify";
import { ISocketMessage, SocketMessageType } from "../models";
import https = require("https");

interface IExWebSocket extends WebSocket {
    isAlive: boolean;
}

@injectable()
export class WebsocketService {
    private secureServer?: https.Server;
    private wss: WebSocket.Server;
    private heartbeat: NodeJS.Timeout;

    constructor() {
        this.wss = new WebSocket.Server({
            port: 8001,
            perMessageDeflate: false
        });

        this.wss.on("connection", this.onServerConnection);
        this.wss.on("close", this.onServerClose);
        this.wss.on("error", this.onServerError);
        this.wss.on("headers", this.onServerHeaders);
        this.wss.on("listening", this.onServerListening);

        // Setup heartbeat function to check alive clients every 30 seconds and disconnect them.
        this.heartbeat = setInterval(() => {
            this.wss.clients.forEach((client: WebSocket) => {
                if ((client as IExWebSocket).isAlive === false) {
                    return client.terminate();
                }

                (client as IExWebSocket).isAlive = false;
                client.ping();
            });
        }, 30000);

    }

    public send(message: ISocketMessage): void {
        Logger.info(LogType.WebSocket, "Sending message to websocket clients.", { message });

        this.wss.clients.forEach((client: WebSocket) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            } else {
                Logger.warn(LogType.WebSocket, "Attempted to send message to websocket client that wasn't open.", {
                    message,
                    status: client.readyState,
                    url: client.url,
                });
            }
        });
    }

    private onServerConnection(this: WebSocket.Server, socket: WebSocket, request: IncomingMessage): void {
        Logger.info(LogType.WebSocket, `Websocket server connection established`, {
            url: request.socket.remoteAddress,
            headers: request.headers,
        });
        (socket as IExWebSocket).isAlive = true;

        socket.send(
            JSON.stringify({
                type: SocketMessageType.SocketConnected,
                message: "Websocket connected.",
                data: undefined,
            })
        );

        // These need to be static cos of how 'this' works in js / ts, and
        // 'this' is the server, not the service, so this.onOpen doesn't work
        socket.on("open", WebsocketService.onOpen);
        socket.on("close", WebsocketService.onClose);
        socket.on("error", WebsocketService.onError);
        socket.on("unexpected-response", WebsocketService.onUnexpectedResponse);
        socket.on("upgrade", WebsocketService.onUpgrade);
        socket.on("message", WebsocketService.onMessage);
        socket.on("ping", WebsocketService.onPing);
        socket.on("pong", WebsocketService.onPong);
    }

    private onServerClose(): void {
        Logger.info(LogType.WebSocket, `Websocket server closed.`);
        clearInterval(this.heartbeat);
    }

    private onServerError(error: Error): void {
        Logger.err(LogType.WebSocket, `Websocket Error occurred.`, error);
    }

    private onServerHeaders(headers: any[], request: IncomingMessage): void {
        Logger.debug(LogType.WebSocket, `Websocket server headers received.`, { headers });
    }

    private onServerListening(): void {
        Logger.info(LogType.WebSocket, `Websocket server listening.`);
    }

    private static onClose(this: WebSocket, code: number, reason: string): void {
        Logger.warn(LogType.WebSocket, `Websocket closed.`, { code, reason });
    }

    private static onError(this: WebSocket, error: Error): void {
        Logger.err(LogType.WebSocket, error);
    }

    private static onMessage(this: WebSocket, data: string | Buffer | ArrayBuffer | Buffer[]): void {
        Logger.info(LogType.WebSocket, `Websocket message received.`, { data });
    }

    private static onOpen(this: WebSocket): void {
        Logger.debug(LogType.WebSocket, `Websocket opened.`);
    }

    private static onPing(this: WebSocket, data: Buffer): void {
        Logger.debug(LogType.WebSocket, `Websocket ping.`, { data });
    }

    private static onPong(this: WebSocket, data: Buffer): void {
        (this as IExWebSocket).isAlive = true;
        Logger.debug(LogType.WebSocket, `Websocket pong.`, { data });
    }

    private static onUnexpectedResponse(this: WebSocket, request: ClientRequest, response: IncomingMessage): void {
        Logger.warn(LogType.WebSocket, `Websocket unexpected response.`, {
            url: response.url,
            headersSent: request.headersSent,
            headers: response.headers,
        });
    }

    private static onUpgrade(this: WebSocket, response: IncomingMessage): void {
        Logger.debug(LogType.WebSocket, `Websocket upgrade`);
    }
}

export default WebsocketService;
