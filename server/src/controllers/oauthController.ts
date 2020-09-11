import { OK, BAD_REQUEST } from 'http-status-codes';
import { Controller, Get } from '@overnightjs/core';
import { Logger, LogType } from '../logger';
import { Request, Response } from 'express';
import OAuthService from './../services/oauthService';
import { inject } from 'inversify';
import TwitchService from './../services/twitchService';
import { ITwitchRedirectResponse } from '../models/twitchApi';

@Controller('api/oauth')
class OAuthController {
    constructor(@inject(OAuthService) private oauthService: OAuthService, @inject(TwitchService) private twitchService: TwitchService) {
    }

    /**
     * Redirect endpoint for Twitch.tv OAuth
     */
    @Get('twitch/redirect')
    private async redirect(req: Request, res: Response) {
        try {
            const authTokenResponse = await this.oauthService.getTwitchAuthToken(req.query as unknown as ITwitchRedirectResponse);
            const verifyResponse = await this.oauthService.verifyTwitchOauth(authTokenResponse.username);
            // Test twitch connection
            await this.twitchService.connect();
            res.status(OK).redirect('/');
        } catch (err) {
            Logger.err(LogType.Twitch, err);
            return res.status(BAD_REQUEST).json({
                message: err.message,
            });
        }
    }

    /**
     * Returns the Twitch.tv OAuth authorize URL for use in the client to redirect, as we can't redirect the client from the server.
     */
    @Get('twitch')
    private twitchAuth(req: Request, res: Response) {
        try {
            const authResponse = res.status(OK).json({
                url: this.oauthService.getTwitchAuthUrl(),
            });
        } catch (err) {
            Logger.err(LogType.Twitch, err);
            return res.status(BAD_REQUEST).json({
                message: err.message,
            });
        }
    }
}

export default OAuthController;