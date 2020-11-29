import { Server } from "@overnightjs/core";
import * as bodyParser from "body-parser";
import * as connectRedis from "connect-redis";
import * as cookieParser from "cookie-parser";
import * as cors from "cors";
import * as express from "express";
import * as expressSession from "express-session";
import * as passport from "passport";
import * as path from "path";
import * as redis from "redis";
import { CryptoHelper } from "./helpers";
import { Logger, LogType } from "./logger";
import { AuthRouter, setupPassport, SongRouter, TwitchRouter } from "./routes";
import { RouteLogger, UserCookie } from "./middleware";
import { TwitchWebService, WebsocketService } from "./services";
import { BotContainer } from "./inversify.config";
import { IUser } from './models';
import { ITwitchUser } from "./models";

const RedisStore = connectRedis(expressSession);

class BotServer extends Server {
    private readonly SERVER_START_MESSAGE = "Server started on port: ";
    private readonly DEV_MESSAGE = "Express Server is running in development mode." + "No front-end is being served";
    private socket: WebsocketService;
    constructor() {
        super(true);
        setupPassport();
        this.setupApp();
        this.socket = BotContainer.get<WebsocketService>(WebsocketService);
    }

    public start(port: number): void {
        this.app.listen(port, () => {
            Logger.info(LogType.ServerInfo, this.SERVER_START_MESSAGE + port);
            if (process.env.NODE_ENV === "development") {
                // tslint:disable-next-line: no-console
                console.debug(this.SERVER_START_MESSAGE + port);
            }
        });

        // Test things
        /* const youtubeService = this.container.get<YoutubeService>(YoutubeService);
        Logger.Info('Testing Youtube API');
        youtubeService.getSongDetails('https://www.youtube.com/watch?v=l0qWjHP1GQc&list=RDl0qWjHP1GQc&start_radio=1'); */
    }

    private setupApp(): void {
        let dir = "";
        if (process.env.NODE_END === "development") {
            dir = path.join(__dirname, "../../client/src/views");
        } else {
            dir = path.join(__dirname, "../../client/build");
        }

        const redisClient = redis.createClient({
            url: process.env.REDIS_URL,
            port: 6379,
        });

        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(cookieParser(CryptoHelper.getSecret()));
        this.app.use(cors());
        this.app.use(RouteLogger);
        this.app.set("views", dir);
        this.app.use(express.static(dir));
        this.app.use(
            expressSession({
                secret: CryptoHelper.getSecret(),
                resave: true,
                saveUninitialized: true,
                cookie: {
                    httpOnly: true,
                    sameSite: true,
                    secure: false,
                    path: "/",
                },
                name: "chewiebot.sid",
                store: new RedisStore({ client: redisClient }),
            })
        );
        this.app.use(passport.initialize());
        this.app.use(passport.session());
        this.app.use((req, res, next) => {
            if (req.session) {
                Logger.info(LogType.ServerInfo, "Session info", req.session);
            }
            next();
        });
        this.app.use(UserCookie);
        this.app.get("/", (req, res) => {
            res.redirect("/");
        });

        this.app.use(AuthRouter);
        this.app.use(SongRouter);
        this.app.use(TwitchRouter);

        // Login/Logout Routes
        this.app.get("/api/isloggedin", (req, res) => {
            console.log("islogedin-----------------------" + JSON.stringify(req.user));
            if (!req.user) {
                return res.status(403).json({ message: "No logged in user." });
            } else {
                const user = req.user as IUser;
                const twitchWebService: TwitchWebService = BotContainer.get(TwitchWebService);
                
                twitchWebService.fetchModerators(user.username).then((moderators: Array<ITwitchUser>) => {
                    console.log("POG_-------------------");
                    console.log(moderators);
                });
                return res.status(200).json(user);
            }
        });
        this.app.get("/api/logout", (req, res) => {
            req.logOut();
            res.redirect("/");
        });

        // Test Routes
        this.app.get("/api/protected", (req, res) => {
            if (req.user) {
                res.send("Protected");
            } else {
                res.send("Locked");
            }
        });
    }
}

export default BotServer;
