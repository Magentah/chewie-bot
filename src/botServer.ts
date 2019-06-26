import * as path from 'path';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import 'reflect-metadata';

import { Server } from '@overnightjs/core';
import { Logger } from '@overnightjs/logger';
import OAuthService from './services/oauthService';
import { Container } from 'inversify';
import OAuthController from './controllers/oauthController';
import DatabaseService from './services/databaseService';
import TwitchService from './services/twitchService';

class BotServer extends Server {
    private readonly SERVER_START_MESSAGE = 'Server started on port: ';
    private readonly DEV_MESSAGE = 'Express Server is running in development mode.' +
                                   'No front-end is being served';

    private container: Container;

    constructor() {
        super(true);
        this.container = new Container();
        this.setupContainer();
        this.setupApp();
    }

    public start(port: number): void {
        this.app.listen(port, () => {
            Logger.Imp(this.SERVER_START_MESSAGE + port);
        });
    }

    private setupContainer(): void {
        this.container.bind<OAuthService>(OAuthService).toSelf();
        this.container.bind<DatabaseService>(DatabaseService).toSelf();
        this.container.bind<TwitchService>(TwitchService).toSelf();
    }

    private setupApp(): void {

        const dir = path.join(__dirname, 'client/build');
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        super.addControllers(new OAuthController(this.container.resolve<OAuthService>(OAuthService), this.container.resolve<TwitchService>(TwitchService)));
        this.app.set('views', dir);
        this.app.use(express.static(dir));
        this.app.get('*', (req, res) => {
            res.sendFile('index.html', { root: dir });
        });
    }
}

export default BotServer;
