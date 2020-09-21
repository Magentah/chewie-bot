import { OK, BAD_REQUEST } from "http-status-codes";
import { Controller, Get } from "@overnightjs/core";
import { Logger, LogType } from "../logger";
import { Request, Response } from "express";
import OAuthService from "./../services/oauthService";
import { inject } from "inversify";
import TwitchService from "./../services/twitchService";
<<<<<<< HEAD:src/controllers/oauthController.ts

@Controller("api/oauth")
=======
import { ITwitchRedirectResponse } from "../models/twitchApi";

@Controller("auth/")
>>>>>>> upstream-tmp:server/src/controllers/oauthController.ts
class OAuthController {
    constructor(
        @inject(OAuthService) private oauthService: OAuthService,
        @inject(TwitchService) private twitchService: TwitchService
<<<<<<< HEAD:src/controllers/oauthController.ts
    ) { }
=======
    ) {}
>>>>>>> upstream-tmp:server/src/controllers/oauthController.ts

    /**
     * Redirect endpoint for Twitch.tv OAuth
     */
<<<<<<< HEAD:src/controllers/oauthController.ts
    @Get("twitch/redirect")
    private async redirect(req: Request, res: Response) {
        try {
            const authTokenResponse = await this.oauthService.getTwitchAuthToken(
                req.query
            );
            const verifyResponse = await this.oauthService.verifyTwitchOauth(
                authTokenResponse.username
            );
=======
    /*@Get("twitch/redirect")
    private async redirect(req: Request, res: Response) {
        try {
            const authTokenResponse = await this.oauthService.getTwitchAuthToken(
                (req.query as unknown) as ITwitchRedirectResponse
            );
            const verifyResponse = await this.oauthService.verifyTwitchOauth(authTokenResponse.username);
>>>>>>> upstream-tmp:server/src/controllers/oauthController.ts
            // Test twitch connection
            console.log("[redirect] authTokenResponse", authTokenResponse);
            await this.twitchService.connect();
            res.status(OK).redirect("/");
        } catch (err) {
            Logger.err(LogType.Twitch, err);
            return res.status(BAD_REQUEST).json({
                message: err.message
            });
        }
    }*/

    /**
     * Returns the Twitch.tv OAuth authorize URL for use in the client to redirect, as we can't redirect the client from the server.
     */
<<<<<<< HEAD:src/controllers/oauthController.ts
    @Get("twitch")
=======
    /*@Get("twitch")
>>>>>>> upstream-tmp:server/src/controllers/oauthController.ts
    private twitchAuth(req: Request, res: Response) {
        try {
            const authResponse = res.status(OK).json({
                url: this.oauthService.getTwitchAuthUrl()
            });
        } catch (err) {
            Logger.err(LogType.Twitch, err);
            return res.status(BAD_REQUEST).json({
                message: err.message
            });
        }
<<<<<<< HEAD:src/controllers/oauthController.ts
    }

    @Get("test")
    private test(req: Request, res: Response) {
        try {
            return res.status(OK).json({
                hello: "world"
            });
        } catch (err) {
            Logger.err(LogType.Server, err.message);
        }
    }
=======
    }*/
>>>>>>> upstream-tmp:server/src/controllers/oauthController.ts
}

export default OAuthController;
