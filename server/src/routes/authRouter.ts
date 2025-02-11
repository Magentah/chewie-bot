import axios from "axios";
import * as express from "express";
import { StatusCodes } from "http-status-codes";
import * as passport from "passport";
import { TwitchAuthorizationLevel } from "../strategy/twitchStrategy";
import * as Config from "../config.json";
import Constants from "../constants";
import { BotContainer } from "../inversify.config";
import { Logger, LogType } from "../logger";
import { IUser, ProviderType, UserLevels } from "../models";
import { SpotifyService, UserService, TwitchUserProfileService, UserPermissionService, StreamlabsService, TwitchService } from "../services";
import { TwitchStrategy, StreamlabsStrategy, SpotifyStrategy, DropboxStrategy } from "../strategy";
import { APIHelper } from "../helpers";

const authRouter: express.Router = express.Router();

function makeTwitchStrategy(authLevel: TwitchAuthorizationLevel): passport.Strategy {
    let scope = "";
    switch (authLevel) {
        case TwitchAuthorizationLevel.TwitchBroadcaster:
            scope = Constants.TwitchBroadcasterScopes;
            break;
        case TwitchAuthorizationLevel.TwitchBot:
            scope = Constants.TwitchBotScopes;
            break;
        case TwitchAuthorizationLevel.TwitchMod:
            scope = Constants.TwitchModScopes;
            break;
    }

    return new TwitchStrategy(
        {
            clientID: Config.twitch.clientId,
            clientSecret: Config.twitch.clientSecret,
            authorizationURL: Constants.TwitchAuthUrl,
            tokenURL: Constants.TwitchTokenUrl,
            callbackURL: Config.twitch.redirectUri,
            scope: scope.split(" "),
            customHeaders: {
                "Client-ID": Config.twitch.clientId,
            },
            passReqToCallback: true
        },
        async (
            req: express.Request,
            // tslint:disable-next-line: variable-name
            _accessToken: any,
            // tslint:disable-next-line: variable-name
            _refreshToken: any,
            profile: { id: number; username: string; displayName: string; profileImageUrl: string },
            done: (err: undefined, user: IUser) => any
        ) => {
            const twitchProfile = await BotContainer.get(TwitchUserProfileService).addTwitchUserProfile({
                id: profile.id,
                displayName: profile.displayName,
                profileImageUrl: profile.profileImageUrl,
                username: profile.username,
            });
            const newUser: IUser = {
                username: profile.username,
                twitchProfileKey: twitchProfile.id,
                userLevel: UserLevels.Viewer,
                vipLevelKey: 1,
                points: 0
            };

            const user = await BotContainer.get(UserService).addUser(newUser);
            await BotContainer.get(UserService).updateAuth({
                accessToken: _accessToken,
                refreshToken: _refreshToken,
                scope: req.query.scope as string,
                type: ProviderType.Twitch,
                userId: user.id ?? 0
            });

            // If the user exists but doesn't have a twitchProfile assigned, the user was added in another way.
            // Assign the twitchProfile and update instead.
            if (!user.twitchProfileKey) {
                user.twitchProfileKey = twitchProfile.id;
                user.twitchUserProfile = twitchProfile;
                await BotContainer.get(UserService).updateUser(user);
            }

            await BotContainer.get(UserPermissionService).updateUserLevels(user);

            return done(undefined, user);
        },
        authLevel
    );
}

export function setupPassport(): void {
    passport.use(makeTwitchStrategy(TwitchAuthorizationLevel.Twitch));
    passport.use(makeTwitchStrategy(TwitchAuthorizationLevel.TwitchBroadcaster));
    passport.use(makeTwitchStrategy(TwitchAuthorizationLevel.TwitchBot));
    passport.use(makeTwitchStrategy(TwitchAuthorizationLevel.TwitchMod));

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
                const authOptions = {
                    headers: { "Authorization": `Bearer ${accessToken}`, "content-type": "application/json" }
                };
                const socketTokenResult = await axios.get(`${Constants.StreamlabsSocketTokenUrl}`, authOptions);
                if (socketTokenResult.status === StatusCodes.OK) {
                    profile.socketToken = socketTokenResult.data.socket_token;
                }

                const user = await BotContainer.get(UserService).getUser(profile.twitch.name);
                if (user) {
                    await BotContainer.get(UserService).updateAuth({
                        accessToken: profile.socketToken,
                        refreshToken,
                        scope: Constants.StreamlabsScopes,
                        type: ProviderType.Streamlabs,
                        userId: user.id ?? 0
                    });
                }

                return done(undefined, profile);
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
                const user = req.user as IUser;
                if (user) {
                    await BotContainer.get(UserService).updateAuth({
                        accessToken,
                        refreshToken,
                        scope: Constants.SpotifyScopes,
                        type: ProviderType.Spotify,
                        userId: user.id ?? 0
                    });
                }

                const account = {
                    accessToken,
                    refreshToken,
                    user: user.username,
                };

                return done(undefined, account);
            }
        )
    );

    if (Config.dropbox?.clientId) {
        passport.use(
            new DropboxStrategy(
                {
                    clientID: Config.dropbox.clientId,
                    clientSecret: Config.dropbox.clientSecret,
                    authorizationURL: Constants.DropboxAuthUrl,
                    tokenURL: Constants.DropboxTokenUrl,
                    callbackURL: Config.dropbox.redirectUri,
                    passReqToCallback: true,
                },
                async (req: express.Request, accessToken: any, refreshToken: any, profile: any, done: any) => {
                    const sessionUser = req.user as IUser;
                    if (sessionUser) {
                        await BotContainer.get(UserService).updateAuth({
                            accessToken,
                            refreshToken,
                            scope: "",
                            type: ProviderType.DropBox,
                            userId: sessionUser.id ?? 0,
                        });
                    }
                    const account = {
                        accessToken,
                        refreshToken,
                        user: sessionUser.username,
                    };
                    return done(undefined, account);
                }
            )
        );
    }
}

// Passport Auth Routes
authRouter.get("/api/auth/twitch", passport.authenticate(TwitchAuthorizationLevel.Twitch));
authRouter.get("/api/auth/twitch/broadcaster", passport.authenticate(TwitchAuthorizationLevel.TwitchBroadcaster));
authRouter.get("/api/auth/twitch/mod", passport.authenticate(TwitchAuthorizationLevel.TwitchMod));
authRouter.get("/api/auth/twitch/bot", passport.authenticate(TwitchAuthorizationLevel.TwitchBot));
authRouter.get("/api/auth/twitch/redirect", passport.authenticate("twitch", { failureRedirect: "/" }), async (req, res) => {
    const user = req.user as IUser;
    if (user.userLevel === UserLevels.Broadcaster) {
        const auth = await BotContainer.get(UserService).getUserPrincipal(user.username, ProviderType.Streamlabs);
        if (auth?.accessToken) {
            BotContainer.get(StreamlabsService).startSocketConnect(auth.accessToken);
        }
    }
    res.redirect("/");
});
authRouter.get(
    "/api/auth/twitch/disconnect",
    (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Broadcaster),
    async (req, res) => {
        const sessionUser = req.user as IUser;
        if (sessionUser) {
            if (await BotContainer.get(UserService).deleteAuth(sessionUser.username, ProviderType.Twitch)) {
                await BotContainer.get(TwitchService).disconnect();
                req.logOut((err) => {
                    Logger.err(LogType.Server, err);
                });
            }

            res.sendStatus(StatusCodes.OK);
        } else {
            res.status(StatusCodes.OK).send(false);
        }
    }
);

authRouter.get("/api/auth/streamlabs", passport.authorize("streamlabs"));
authRouter.get("/api/auth/streamlabs/callback", passport.authorize("streamlabs", { failureRedirect: "/" }), (req, res) => {
    Logger.info(LogType.Server, JSON.stringify(req.account));
    const user = req.user;
    if (user) {
        user.account = req.account;
    }
    // TODO: At the moment we don't connect automatically to the streamlabs socket and wait until manually clicking on
    // the connect button. Keeping this here just as it's still not decided if that's the best way.
    // BotContainer.get(StreamlabsService).startSocketConnect(req.account.socketToken);
    res.redirect("/");
});
authRouter.get(
    "/api/auth/streamlabs/disconnect",
    (req, res, next) => APIHelper.checkUserLevel(req, res, next, UserLevels.Broadcaster),
    async (req, res) => {
        const sessionUser = req.user as IUser;
        if (sessionUser) {
            if (await BotContainer.get(UserService).deleteAuth(sessionUser.username, ProviderType.Streamlabs)) {
                BotContainer.get(StreamlabsService).disconnect();
            }
            res.sendStatus(StatusCodes.OK);
        } else {
            res.status(StatusCodes.OK).send(false);
        }
    }
);

authRouter.get("/api/auth/spotify", passport.authorize("spotify"));
authRouter.get("/api/auth/spotify/hasconfig", async (req, res) => {
    const sessionUser = req.user as IUser;
    if (sessionUser) {
        const user = await BotContainer.get(UserService).getUserPrincipal(sessionUser.username, ProviderType.Spotify);
        if (user?.refreshToken) {
            res.send(true);
            return;
        }
    }

    res.send(false);
});
authRouter.get("/api/auth/spotify/disconnect", async (req, res) => {
    const sessionUser = req.user as IUser;
    if (sessionUser) {
        if (await BotContainer.get(UserService).deleteAuth(sessionUser.username, ProviderType.Spotify)) {
            const user = await BotContainer.get(UserService).getUser(sessionUser.username);
            req.login(user as Express.User, (err: any) => {
                Logger.info(LogType.Spotify, "Updated session user");
            });
        }

        res.sendStatus(StatusCodes.OK);
    } else {
        res.status(StatusCodes.OK).send(false);
    }
});
authRouter.get("/api/auth/spotify/access", async (req, res) => {
    const sessionUser = req.user as IUser;
    if (sessionUser) {
        const userAuth = await BotContainer.get(UserService).getUserPrincipal(sessionUser.username, ProviderType.Spotify);
        if (userAuth === undefined) {
            res.sendStatus(StatusCodes.UNAUTHORIZED);
        } else {
            const newToken = await BotContainer.get(SpotifyService).getNewAccessToken(userAuth);
            if (newToken.newRefreshToken) {
                userAuth.refreshToken = newToken.newRefreshToken;
                BotContainer.get(UserService).updateAuth(userAuth);
            }

            res.status(StatusCodes.OK).send(newToken.accessToken);
        }
    } else {
        res.sendStatus(StatusCodes.FORBIDDEN);
    }
});

authRouter.get("/api/auth/spotify/callback", passport.authorize("spotify", { failureRedirect: "/" }), (req, res) => {
    res.redirect("/");
});

authRouter.get("/api/auth/dropbox", passport.authorize("dropbox"));
authRouter.get("/api/auth/dropbox/redirect", passport.authorize("dropbox", { failureRedirect: "/" }), (req, res) => {
    res.redirect("/");
});
authRouter.get("/api/auth/dropbox/disconnect", async (req, res) => {
    const sessionUser = req.user as IUser;
    if (sessionUser) {
        if (await BotContainer.get(UserService).deleteAuth(sessionUser.username, ProviderType.DropBox)){
            const user = await BotContainer.get(UserService).getUser(sessionUser.username);
            req.login(user as Express.User, (err: any) => {
                Logger.info(LogType.Backup, "Updated session user for Dropbox backups");
            });
            res.sendStatus(StatusCodes.OK);
        } else {
            res.sendStatus(StatusCodes.OK).send(false);
        }
    }
});

export default authRouter;
