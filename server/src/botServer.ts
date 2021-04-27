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
import * as Routers from "./routes";
import { setupPassport } from "./routes/authRouter"
import { UserCookie } from "./middleware";
import { CommandService, StreamlabsService, TwitchService, WebsocketService, TwitchEventService } from "./services";
import { BotContainer } from "./inversify.config";
import { TwitchMessageSignatureError } from "./errors";
import TwitchHelper from "./helpers/twitchHelper";
import { StatusCodes } from "http-status-codes";
import { UsersRepository } from "./database";
import { createDatabaseBackupJob } from "./cronjobs";
import * as Config from "./config.json";

const RedisStore = connectRedis(expressSession);

class BotServer extends Server {
    private readonly SERVER_START_MESSAGE = "Server started on port: ";
    private readonly DEV_MESSAGE = "Express Server is running in development mode." + "No front-end is being served";
    private socket: WebsocketService;
    private commands: CommandService;

    constructor() {
        super(true);
        setupPassport();
        this.setupApp();
        createDatabaseBackupJob();

        // Force call constructor before they're used by anything else. Probably a better way to do this...
        this.socket = BotContainer.get<WebsocketService>(WebsocketService);
        this.commands = BotContainer.get<CommandService>(CommandService);

        // Go live on startup (if configured).
        const twitchService = BotContainer.get<TwitchService>(TwitchService);
        twitchService.initialize().then(() => {
            twitchService.connect();
        });

        if (Config.twitch.broadcasterName) {
            const streamlabsService = BotContainer.get<StreamlabsService>(StreamlabsService);
            streamlabsService.connectOnStartup(Config.twitch.broadcasterName);

            const twitchEventService = BotContainer.get<TwitchEventService>(TwitchEventService);
            twitchEventService.startup();
        }
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

        this.app.use(
            bodyParser.json({
                verify: (req, res, buf, encoding) => TwitchHelper.verifyTwitchEventsubSignature(req, res, buf, encoding),
            })
        );

        // Catch error from verifyTwitchEventsubSignature and return a 403 if verification fails.
        this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
            if (err instanceof TwitchMessageSignatureError) {
                Logger.err(LogType.Twitch, "Signature Failed for Twitch EventSub Message", err);
                res.sendStatus(StatusCodes.UNAUTHORIZED);
            } else {
                next();
            }
        });

        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(cookieParser(CryptoHelper.getSecret()));
        this.app.use(cors());
        this.app.set("views", dir);
        this.app.use(express.static(dir));
        this.app.use(
            expressSession({
                secret: CryptoHelper.getSecret(),
                resave: true,
                saveUninitialized: true,
                cookie: {
                    httpOnly: true,
                    secure: false,
                    path: "/",
                },
                name: "chewiebot.sid",
                store: new RedisStore({ client: redisClient as any }),
            })
        );
        this.app.use(passport.initialize());
        this.app.use(passport.session());
        this.app.use(UserCookie);
        this.app.get("/", (req, res) => {
            res.redirect("/");
        });

        Object.values(Routers).forEach((val, index) => {
            this.app.use(val);
        });

        // Login/Logout Routes
        this.app.get("/api/isloggedin", async (req, res) => {
            if (!req.user) {
                return res.status(200).json(UsersRepository.getAnonUser());
            } else {
                return res.status(200).json(req.user);
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
