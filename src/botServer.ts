import * as path from 'path';
import * as express from 'express';
import * as bodyParser from 'body-parser';

import { BotContainer } from './inversify.config';

import { Server } from '@overnightjs/core';
import OAuthService from './services/oauthService';
import OAuthController from './controllers/oauthController';
import TwitchService from './services/twitchService';

import { Logger, LogLevel, LogType } from './logger';


class BotServer extends Server {
    private readonly SERVER_START_MESSAGE = 'Server started on port: ';
    private readonly DEV_MESSAGE = 'Express Server is running in development mode.' +
                                   'No front-end is being served';

    constructor() {
        super(true);
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

    private setupApp(): void {

        const dir = path.join(__dirname, 'client/build');
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        super.addControllers(new OAuthController(BotContainer.get(OAuthService), BotContainer.get(TwitchService)));
        this.app.set('views', dir);
        this.app.use(express.static(dir));
        this.app.get('*', (req, res) => {
            res.sendFile('index.html', { root: dir });
        });
    }
}

export default BotServer;
