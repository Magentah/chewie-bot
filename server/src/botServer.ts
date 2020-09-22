import * as path from "path";
import * as express from "express";
import * as expressSession from "express-session";
import * as redis from "redis";
import * as connectRedis from "connect-redis";
import * as bodyParser from "body-parser";
import * as passport from "passport";

import { BotContainer } from "./inversify.config";

import { Server } from "@overnightjs/core";
import TwitchService from "./services/twitchService";
import TwitchStrategy from "./strategy/twitchStrategy";

import { Logger, LogType } from "./logger";
import CryptoHelper from "./helpers/cryptoHelper";
import Constants from "./constants";
import UserService from "./services/userService";
import { IUser } from "./models/user";

import * as Config from "./config.json";
const RedisStore = connectRedis(expressSession);

class BotServer extends Server {
    private readonly SERVER_START_MESSAGE = "Server started on port: ";
    private readonly DEV_MESSAGE = "Express Server is running in development mode." + "No front-end is being served";

    constructor() {
        super(true);
        this.setupPassport();
        this.setupApp();
    }

    public start(port: number): void {
        this.app.listen(port, () => {
            Logger.info(LogType.ServerInfo, this.SERVER_START_MESSAGE + port);
        });

        // Test things
        /* const youtubeService = this.container.get<YoutubeService>(YoutubeService);
        Logger.Info('Testing Youtube API');
        youtubeService.getSongDetails('https://www.youtube.com/watch?v=l0qWjHP1GQc&list=RDl0qWjHP1GQc&start_radio=1'); */
    }

    private setupPassport(): void {
        passport.use(
            new TwitchStrategy(
                {
                    clientID: Config.twitch.clientId,
                    clientSecret: Config.twitch.clientSecret,
                    authorizationURL: Constants.TwitchAuthUrl,
                    tokenURL: Constants.TwitchTokenUrl,
                    callbackURL: Config.twitch.redirectUri,
                    scope: Constants.TwitchScopes.split(" "),
                    customHeaders: {
                        "Client-ID": Config.twitch.clientId,
                    },
                },
                async (
                    // tslint:disable-next-line: variable-name
                    _accessToken: any,
                    // tslint:disable-next-line: variable-name
                    _refreshToken: any,
                    profile: { username: string },
                    done: (err: undefined, user: IUser) => any
                ) => {
                    await BotContainer.get(UserService).addUser(profile.username);
                    const user = await BotContainer.get(UserService).getUser(profile.username);
                    return done(undefined, user);
                }
            )
        );

        passport.serializeUser((user, done) => {
            done(undefined, user);
        });

        passport.deserializeUser((user, done) => {
            done(undefined, user);
        });
    }

    private setupApp(): void {
        const dir = path.join(__dirname, "../../client/build");

        super.addControllers(BotContainer.get(TwitchService));

        const redisClient = redis.createClient({
            url: process.env.REDIS_URL,
            port: 6379,
        });

        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.set("views", dir);
        this.app.use(express.static(dir));
        this.app.use(
            expressSession({
                secret: CryptoHelper.generateSecret(),
                resave: true,
                saveUninitialized: true,
                cookie: { httpOnly: true, sameSite: true, secure: false, path: "/" },
                name: "chewiebot",
                store: new RedisStore({ client: redisClient }),
            })
        );
        this.app.use(passport.initialize());
        this.app.use(passport.session());
        this.app.use((req, res, next) => {
            if (req.session) {
                Logger.info(LogType.ServerInfo, JSON.stringify(req.session));
            }
            next();
        });
        this.app.get("/", (req, res) => {
            res.sendFile("index.html", { root: dir });
        });
        this.app.get("/api/auth/twitch", passport.authenticate("twitch"));
        this.app.get(
            "/api/auth/twitch/redirect",
            passport.authenticate("twitch", { failureRedirect: "/" }),
            (res, req) => {
                req.redirect("/");
            }
        );
        this.app.get("/api/protected", (res, req) => {
            if (res.user) {
                req.send("Protected");
            } else {
                req.send("Locked");
            }
        });
    }
}

export default BotServer;
