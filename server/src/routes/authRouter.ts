import axios from "axios";
import * as express from "express";
import { StatusCodes } from "http-status-codes";
import * as passport from "passport";
import { TwitchAuthorizationLevel } from "../strategy/twitchStrategy";
import * as Config from "../config.json";
import Constants from "../constants";
import { BotContainer } from "../inversify.config";
import { Logger, LogType } from "../logger";
import { IUser } from "../models";
import { SpotifyService, UserService, TwitchUserProfileService, UserPermissionService, StreamlabsService } from "../services";
import { TwitchStrategy, StreamlabsStrategy, SpotifyStrategy, DropboxStrategy } from "../strategy";

const authRouter: express.Router = express.Router();

function MakeTwitchStrategy(authLevel: TwitchAuthorizationLevel): passport.Strategy {
    return new TwitchStrategy(
        {
            clientID: Config.twitch.clientId,
            clientSecret: Config.twitch.clientSecret,
            authorizationURL: Constants.TwitchAuthUrl,
            tokenURL: Constants.TwitchTokenUrl,
            callbackURL: Config.twitch.redirectUri,
            scope: authLevel === TwitchAuthorizationLevel.TwitchBroadcaster ? Constants.TwitchBroadcasterScopes.split(" ") : "",
            customHeaders: {
                "Client-ID": Config.twitch.clientId,
            },
        },
        async (
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
                userLevelKey: 1,
                vipLevelKey: 1,
                points: 0,
                hasLogin: false,
            };

            const user = await BotContainer.get(UserService).addUser(newUser);
            user.accessToken = _accessToken;
            user.refreshToken = _refreshToken;

            // If the user exists but doesn't have a twitchProfile assigned, the user was added in another way.
            // Assign the twitchProfile and update instead.
            if (!user.twitchProfileKey) {
                user.twitchProfileKey = twitchProfile.id;
                user.twitchUserProfile = twitchProfile;
            }

            await BotContainer.get(UserService).updateUser(user);
            await BotContainer.get(UserPermissionService).updateUserLevels(user);

            return done(undefined, user);
        },
        authLevel
    );
}

export function setupPassport(): void {
    passport.use(MakeTwitchStrategy(TwitchAuthorizationLevel.Twitch));
    passport.use(MakeTwitchStrategy(TwitchAuthorizationLevel.TwitchBroadcaster));

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
                const socketTokenResult = await axios.get(`${Constants.StreamlabsSocketTokenUrl}?access_token=${accessToken}`);
                if (socketTokenResult.status === StatusCodes.OK) {
                    profile.socketToken = socketTokenResult.data.socket_token;
                }

                const user = await BotContainer.get(UserService).getUser(profile.twitch.name);
                if (user) {
                    user.streamlabsToken = accessToken;
                    user.streamlabsSocketToken = profile.socketToken;
                    await BotContainer.get(UserService).updateUser(user);
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
                const userData = JSON.parse(req.cookies.user);
                const user = await BotContainer.get(UserService).addUser(userData.username);
                user.spotifyRefresh = refreshToken;
                await BotContainer.get(UserService).updateUser(user);
                const account = {
                    accessToken,
                    refreshToken,
                    user: user.username,
                };
                // TODO: This shouldn't be using login. Login is done with TwitchStrategy, this should use authentication similar to StreamlabsStrategy.
                /*req.logIn(user, (err) => {
                    if (!err) {
                        Logger.info(LogType.ServerInfo, `Logged in user ${user.username}`);
                    }
                });*/
                return done(undefined, account);
            }
        )
    );

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
                    const user = await BotContainer.get(UserService).getUser(sessionUser.username);
                    if (user) {
                        user.dropboxAccessToken = accessToken;
                        await BotContainer.get(UserService).updateUser(user);
                    }
                }
            }
        )
    );
}

// Passport Auth Routes
authRouter.get("/api/auth/twitch", passport.authenticate("twitch"));
authRouter.get("/api/auth/twitch/broadcaster", passport.authenticate("twitch-broadcaster"));
authRouter.get("/api/auth/twitch/redirect", passport.authenticate("twitch", { failureRedirect: "/" }), (req, res) => {
    const user = req.user as IUser;
    if (user.streamlabsSocketToken) {
        BotContainer.get(StreamlabsService).startSocketConnect(user.streamlabsSocketToken);
    }
    res.redirect("/");
});
authRouter.get("/api/auth/streamlabs", passport.authorize("streamlabs"));
authRouter.get("/api/auth/streamlabs/callback", passport.authorize("streamlabs", { failureRedirect: "/" }), async (req, res) => {
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
authRouter.get("/api/auth/spotify", passport.authorize("spotify"));
authRouter.get("/api/auth/spotify/hasconfig", async (req, res) => {
    const sessionUser = req.user as IUser;
    if (sessionUser) {
        const user = await BotContainer.get(UserService).getUser(sessionUser.username);
        if (user?.spotifyRefresh) {
            res.send(true);
            return;
        }
    }

    res.send(false);
});
authRouter.get("/api/auth/spotify/access", async (req, res) => {
    const sessionUser = req.user as IUser;
    if (sessionUser) {
        const user = await BotContainer.get(UserService).getUser(sessionUser.username);
        if (user === undefined) {
            res.sendStatus(StatusCodes.UNAUTHORIZED);
        } else {
            const newToken = await BotContainer.get(SpotifyService).getNewAccessToken(user);
            if (newToken.newRefreshToken) {
                user.refreshToken = newToken.newRefreshToken;
                BotContainer.get(UserService).updateUser(user);
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
authRouter.get("/api/auth/dropbox/redirect", passport.authorize("dropbox", { failureRedirect: "/" }), async (req, res) => {
    res.redirect("/");
});

export default authRouter;
