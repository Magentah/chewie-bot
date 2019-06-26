import { OK, BAD_REQUEST } from 'http-status-codes';
import { Controller, Get } from '@overnightjs/core';
import { Logger } from '@overnightjs/logger';
import { Request, Response } from 'express';
import * as Req from 'request-promise-native';

import Constants from './../constants';
import OAuthService from './../services/oauthService';
import { inject } from 'inversify';

@Controller('api/oauth')
class OAuthController {
    constructor(@inject(OAuthService) private oauthService: OAuthService) {
    }

    /**
     * Redirect endpoint for Twitch.tv OAuth
     */
    @Get('twitch/redirect')
    private redirect(req: Request, res: Response) {
        try {
            Logger.Info(`Twitch Redirect: ${JSON.stringify(req.query)}`);
            this.oauthService.getTwitchAuthToken(req.query)
            .then((result) => {
                this.oauthService.getTwitchUserInfo()
                .then((response) => res.status(OK).redirect('/'));
            });
        } catch (err) {
            Logger.Err(err, true);
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
            Logger.Info(`Twitch API Call`);
            const authResponse = res.status(OK).json({
                url: this.oauthService.getTwitchAuthUrl(),
            });
        } catch (err) {
            Logger.Err(err, true);
            return res.status(BAD_REQUEST).json({
                message: err.message,
            });
        }
    }
}

export default OAuthController;
