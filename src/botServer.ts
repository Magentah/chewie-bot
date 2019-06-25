import * as path from 'path';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as controllers from './controllers';

import { Server } from '@overnightjs/core';
import { Logger } from '@overnightjs/logger';
import TestController from './controllers/testController';

class BotServer extends Server {
    private readonly SERVER_START_MESSAGE = 'Server started on port: ';
    private readonly DEV_MESSAGE = 'Express Server is running in development mode.' +
                                   'No front-end is being served';

    constructor() {
        super(true);
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        super.addControllers(new TestController());
        // point to front-end
        if (process.env.NODE_ENV !== 'production') {
            this.app.get('*', (req, res) => res.send(this.DEV_MESSAGE));
        }
    }

    public start(port: number): void {
        this.app.listen(port, () => {
            Logger.Imp(this.SERVER_START_MESSAGE + port);
        });
    }

    private setupControllers(): void {
        const controllerInstances = [];
        for (const name in controllers) {
            if (controllers.hasOwnProperty(name)) {
                const Controller = (controllers as any)[name];
                controllerInstances.push(new Controller());
            }
        }

        super.addControllers(controllerInstances);
    }
}

export default BotServer;
