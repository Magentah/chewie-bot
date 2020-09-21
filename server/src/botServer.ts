import * as path from "path";
import * as express from "express";
import * as expressSession from "express-session";
import * as bodyParser from "body-parser";
import * as passport from "passport";

import { BotContainer } from "./inversify.config";

import { Server } from "@overnightjs/core";
import OAuthService from "./services/oauthService";
import OAuthController from "./controllers/oauthController";
import TwitchService from "./services/twitchService";
import TwitchStrategy from "./strategy/twitchStrategy";

import { Logger, LogType } from "./logger";
import CryptoHelper from "./helpers/cryptoHelper";
import Constants from "./constants";
import UserService from "./services/userService";
import { IUser } from "./models/user";

import Config from "./config";

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

        super.addControllers(new OAuthController(BotContainer.get(OAuthService), BotContainer.get(TwitchService)));

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
        // tslint:disable-next-line: variable-name
        this.app.get("/", (req, res) => {
            res.sendFile("index.html", { root: dir });
        });
        this.app.get("/auth/twitch", passport.authenticate("twitch"));
        this.app.get(
            "/auth/twitch/redirect",
            // tslint:disable-next-line: variable-name
            passport.authenticate("twitch", { failureRedirect: "/" }),
            (res, req) => {
                req.redirect("/");
            }
        );
        this.app.get("/protected", (req, res) => {
            if (req.user) {
                res.send("protected");
            } else {
                res.send("login");
            }
        });
    }
}

export default BotServer;
