import * as express from "express";
import * as passport from "passport";
import { UserPermissionService } from 'src/services/userPermissionService';
import * as Config from "../config.json";
import Constants from "../constants";
import { BotContainer } from "../inversify.config";
import { Logger, LogType } from "../logger";
import { IUser } from "../models";
import { UserService } from "../services";
import { TwitchStrategy, StreamlabsStrategy } from "../strategy";

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
                const userService: UserService = BotContainer.get(UserService);
                // const userPermissionService: UserPermissionService = BotContainer.get(UserPermissionService);
                
                await userService.addUser(profile.username);

                const user: IUser = await userService.getUser(profile.username);

                user.accessToken = _accessToken;    
                user.refreshToken = _refreshToken;
                await userService.updateUser(user);

                // await userPermissionService.updateUserLevels(user)
                
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

export default authRouter;
