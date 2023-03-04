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
import { APIHelper, CryptoHelper } from "./helpers";
import { Logger, LogType } from "./logger";
import * as Routers from "./routes";
import { setupPassport } from "./routes/authRouter";
import { UserCookie } from "./middleware";
import {
    CommandService,
    StreamlabsService,
    TwitchService,
    WebsocketService,
    TwitchEventService,
    TaxService,
    AchievementService,
    DatabaseService,
} from "./services";
import { BotContainer } from "./inversify.config";
import { TwitchMessageSignatureError } from "./errors";
import TwitchHelper from "./helpers/twitchHelper";
import { StatusCodes } from "http-status-codes";
import { UsersRepository } from "./database";
import { createDatabaseBackupJob } from "./cronjobs";
import * as Config from "./config.json";
import { IUser, ProviderType, UserLevels } from "./models";
import TwitchPubSubService from "./services/twitchPubSubService";
import DropboxService from "./services/dropboxService";
import Constants from "./constants";

const RedisStore = connectRedis(expressSession);

class BotServer extends Server {
    private readonly SERVER_START_MESSAGE = "Server started on port: ";
    private socket: WebsocketService;
    private commands: CommandService;
    private taxService: TaxService;
    private achievementService: AchievementService;

    constructor() {
        super(true);
        setupPassport();
        this.setupApp();
        createDatabaseBackupJob();

        // Force call constructor before they're used by anything else. Probably a better way to do this...
        this.socket = BotContainer.get<WebsocketService>(WebsocketService);

        this.commands = BotContainer.get<CommandService>(CommandService);
        this.taxService = BotContainer.get<TaxService>(TaxService);

        this.achievementService = BotContainer.get<AchievementService>(AchievementService);
        this.achievementService.setup();

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

            const twitchPubSub = BotContainer.get<TwitchPubSubService>(TwitchPubSubService);
            twitchPubSub.connect();
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

        const busboyBodyParser = require("busboy-body-parser");
        this.app.use(busboyBodyParser({ extended: true }));
        this.app.use(cookieParser(CryptoHelper.getSecret()));
        this.app.use(cors());
        this.app.set("views", dir);
        this.app.use(express.static(dir));
        this.app.use("/img", express.static(path.join(process.cwd(), "images")));
        this.app.use(
            expressSession({
                secret: CryptoHelper.getSecret(),
                resave: true,
                rolling: true,
                saveUninitialized: true,
                cookie: {
                    httpOnly: true,
                    secure: false,
                    path: "/",
                    // Keep session alive for 3 months
                    maxAge: 3 * 4 * 7 * 24 * 60 * 60 * 1000
                },
                name: "chewiebot.sid",
                store: new RedisStore({ client: redisClient }),
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
                const sessionUser = req.user as IUser;
                const authStates = await BotContainer.get(UsersRepository).getUserAuthStatus(sessionUser.id ?? 0);
                let missingTwitchPermissions: string[] = [];
                if (sessionUser.userLevel === UserLevels.Broadcaster) {
                    const twitchAuth = await BotContainer.get(UsersRepository).getUserAuth(sessionUser.id ?? 0, ProviderType.Twitch);
                    if (twitchAuth !== undefined && twitchAuth.scope !== Constants.TwitchBroadcasterScopes) {
                        const current = twitchAuth.scope.split(" ");
                        const needed = Constants.TwitchBroadcasterScopes.split(" ");
                        const missing = needed.filter(item => current.indexOf(item) < 0);
                        missingTwitchPermissions = missing;
                    }
                }
                return res.status(200).json({
                    ...sessionUser,
                    authorizations: Object.fromEntries(authStates),
                    missingTwitchPermissions
                });
            }
        });
        this.app.get("/api/logout", (req, res) => {
            req.logOut((err) => {
                Logger.err(LogType.Server, err);
            });
            res.redirect("/");
        });
        // Allow setting custom user levels for debug purposes.
        this.app.get("/api/debug", async (req, res) => {
            const sessionUser = req.user as IUser;

            if (sessionUser && req.query.userLevel) {
                const debugUsernames = Config.debug.usernames as string[];
                if (debugUsernames.indexOf(sessionUser.username) >= 0) {
                    sessionUser.userLevel = parseInt(req.query.userLevel.toString(), 10);
                    req.login(sessionUser as Express.User, (err: any) => {
                        Logger.info(LogType.Server, "Updated session user");
                    });
                    res.redirect("/");
                    return;
                }
            }

            return res.sendStatus(404);
        });

        this.app.get(
            "/api/dropbox/backup",
            (req: express.Request, res: express.Response, next: express.NextFunction) => APIHelper.checkUserLevel(req, res, next, UserLevels.Moderator),
            async (req: express.Request, res: express.Response) => {
                const user = req.user as IUser;
                if (user) {
                    const databaseService = BotContainer.get<DatabaseService>(DatabaseService);
                    const dropboxService = BotContainer.get<DropboxService>(DropboxService);

                    const databaseFilename = databaseService.createBackup();
                    if (databaseFilename) {
                        await dropboxService.uploadFile("db/backups", databaseFilename);
                        res.sendStatus(StatusCodes.ACCEPTED);
                    } else {
                        res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
                    }
                } else {
                    res.sendStatus(StatusCodes.UNAUTHORIZED);
                }
            }
        );

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
