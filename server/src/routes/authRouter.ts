import * as express from "express";
import { StatusCodes } from 'http-status-codes';
import * as passport from "passport";
import * as Config from "../config.json";
import Constants from "../constants";
import { BotContainer } from "../inversify.config";
import { Logger, LogType } from "../logger";
import { IUser } from "../models";
import { SpotifyService, UserService } from "../services";
import { TwitchStrategy, StreamlabsStrategy, SpotifyStrategy } from "../strategy";

const authRouter: express.Router = express.Router();

export function setupPassport(): void {
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

    passport.serializeUser((user: any, done) => {
        done(undefined, user);
    });

    passport.deserializeUser((user: any, done) => {
        done(undefined, user);
    });

    passport.use(
        new StreamlabsStrategy(
            {
                clientID: Config.streamlabs.clientId,
                clientSecret: Config.streamlabs.clientSecret,
                authorizationURL: Constants.StreamlabsAuthUrl,
                tokenURL: Constants.StreamlabsTokenUrl,
                callbackURL: Config.streamlabs.redirectUri,
                scope: Constants.StreamlabsScopes.split(" "),
                passReqToCallback: true,
            },
            async (req: express.Request, accessToken: any, refreshToken: any, profile: any, done: any) => {
                const user = await BotContainer.get(UserService).getUser(profile.username);
                user.streamlabsRefresh = refreshToken;
                user.streamlabsToken = accessToken;
                await BotContainer.get(UserService).updateUser(user);
                const account = {
                    accessToken,
                    refreshToken,
                    user: user.username,
                };
                req.logIn(user, (err) => {
                    if (!err) {
                        Logger.info(LogType.ServerInfo, `Logged in user ${user.username}`);
                    }
                });
                return done(undefined, account);
            }
        )
    );

    passport.use(
        new SpotifyStrategy(
            {
                clientID: Config.spotify.clientId,
                clientSecret: Config.spotify.clientSecret,
                authorizationURL: Constants.SpotifyAuthUrl,
                tokenURL: Constants.SpotifyTokenUrl,
                callbackURL: Config.spotify.redirectUri,
                scope: Constants.SpotifyScopes.split(" "),
                passReqToCallback: true,
            },
            async (req: express.Request, accessToken: any, refreshToken: any, profile: any, done: any) => {
                const userData = JSON.parse(req.cookies.user);
                const user = await BotContainer.get(UserService).getUser(userData.username);
                user.spotifyRefresh = refreshToken;
                await BotContainer.get(UserService).updateUser(user);
                const account = {
                    accessToken,
                    refreshToken,
                    user: user.username,
                };
                req.logIn(user, (err) => {
                    if (!err) {
                        Logger.info(LogType.ServerInfo, `Logged in user ${user.username}`);
                    }
                });
                return done(undefined, account);
            }
        )
    );
}

// Passport Auth Routes
authRouter.get("/api/auth/twitch", passport.authenticate("twitch"));
authRouter.get("/api/auth/twitch/redirect", passport.authenticate("twitch", { failureRedirect: "/" }), (req, res) => {
    res.redirect("/");
});
authRouter.get("/api/auth/streamlabs", passport.authorize("streamlabs"));
authRouter.get(
    "/api/auth/streamlabs/callback",
    passport.authorize("streamlabs", { failureRedirect: "/" }),
    (req, res) => {
        res.redirect("/");
    }
);
authRouter.get("/api/auth/spotify", passport.authorize("spotify"));
authRouter.get("/api/auth/spotify/hasconfig", async (req, res) => {
    let sessionUser = req.user as IUser;
    if (sessionUser) {
        const user = await BotContainer.get(UserService).getUser(sessionUser.username);
        if (user.spotifyRefresh) {
            res.send(true);
            return;
        }
    }

    res.send(false);
} );
authRouter.get("/api/auth/spotify/access", async (req, res) => {
    let sessionUser = req.user as IUser;
    if (sessionUser) {
        const user = await BotContainer.get(UserService).getUser(sessionUser.username);
        const newToken = await BotContainer.get(SpotifyService).getNewAccessToken(user);
        if (newToken.newRefreshToken) {
            user.refreshToken = newToken.newRefreshToken;
            BotContainer.get(UserService).updateUser(user);
        }
        
        res.status(StatusCodes.OK).send(newToken.accessToken);
    } else {
        res.sendStatus(StatusCodes.FORBIDDEN);
    }
} );

authRouter.get(
    "/api/auth/spotify/callback",
    passport.authorize("spotify", { failureRedirect: "/" }),
    (req, res) => {
        res.redirect("/");
    }
);

export default authRouter;
