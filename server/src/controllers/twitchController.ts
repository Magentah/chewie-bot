import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { ResponseStatus } from "../models";
import { Logger, LogType } from "../logger";
import { TwitchService, TwitchServiceProvider, BotSettingsService, TwitchEventService } from "../services";

enum TwitchEventMessageType {
    Verification,
    Notification,
    Revocation,
}

@injectable()
class TwitchController {
    constructor(
        @inject("TwitchServiceProvider") private twitchProvider: TwitchServiceProvider,
        @inject(BotSettingsService) private botSettingsService: BotSettingsService,
        @inject(TwitchEventService) private twitchEventService: TwitchEventService
    ) {
        //
    }

    public async joinChannel(req: Request, res: Response): Promise<void> {
        try {
            const twitchService = await this.twitchProvider();
            twitchService.joinChannel(`#${req.params.channel}`);
            res.sendStatus(StatusCodes.OK);
        } catch (error) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(error);
        }
    }

    public async leaveChannel(req: Request, res: Response): Promise<void> {
        try {
            const twitchService = await this.twitchProvider();
            twitchService.leaveChannel(`#${req.params.channel}`);
            res.sendStatus(StatusCodes.OK);
        } catch (error) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(error);
        }
    }

    public async getStatus(req: Request, res: Response): Promise<void> {
        const twitchService = await this.twitchProvider();
        res.status(StatusCodes.OK).send(twitchService.getStatus());
    }

    public async connect(req: Request, res: Response): Promise<void> {
        try {
            const twitchService = await this.twitchProvider();
            twitchService.connect();
            res.sendStatus(StatusCodes.OK);
        } catch (error) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(error);
        }
    }

    public async disconnect(req: Request, res: Response): Promise<void> {
        try {
            const twitchService = await this.twitchProvider();
            twitchService.disconnect();
            res.sendStatus(StatusCodes.OK);
        } catch (error) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(error);
        }
    }

    public async getBotSettings(req: Request, res: Response): Promise<void> {
        const settings = await this.botSettingsService.getSettings();
        res.status(StatusCodes.OK).send(settings);
    }

    public async saveBotSettings(req: Request, res: Response): Promise<void> {
        try {
            await this.botSettingsService.addOrUpdateSettings({
                username: req.body.username,
                oauth: req.body.oauth,
            });
            const twitchService = await this.twitchProvider();
            const result = await twitchService.initialize();
            if (result.status === ResponseStatus.Success) {
                res.sendStatus(StatusCodes.OK);
            } else {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ message: result.message, data: result.data });
            }
        } catch (error) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(error);
        }
    }

    public async setEventSubCallbackUrl(req: Request, res: Response): Promise<void> {
        await this.twitchEventService.setBaseCallbackUrl(req.body.url);
        res.sendStatus(StatusCodes.OK);
    }

    public async getEventSubSubscriptions(req: Request, res: Response): Promise<void> {
        await this.twitchEventService.getSubscriptions();
        res.sendStatus(StatusCodes.OK);
    }

    public async subscribeEventSub(req: Request, res: Response): Promise<void> {
        await this.twitchEventService.subscribeEvent(req.body.event, req.body.userId);
        res.sendStatus(StatusCodes.ACCEPTED);
    }

    public async eventsubCallback(req: Request, res: Response): Promise<void> {
        Logger.info(LogType.Twitch, req.body);

        const type = this.getTwitchEventMessageType(req);

        switch (type) {
            case TwitchEventMessageType.Verification: {
                res.send(req.body.challenge);
                break;
            }
            case TwitchEventMessageType.Notification: {
                this.twitchEventService.handleNotification(req.body);
                res.sendStatus(StatusCodes.ACCEPTED);
                break;
            }
            case TwitchEventMessageType.Revocation: {
                res.sendStatus(StatusCodes.ACCEPTED);
                break;
            }
        }
    }

    public async eventsubNotification(req: Request, res: Response): Promise<void> {}

    private getTwitchEventMessageType(req: Request): TwitchEventMessageType {
        if ((req.headers["twitch-eventsub-message-type"] as string) === "webhook_callback_verification") {
            return TwitchEventMessageType.Verification;
        } else if ((req.headers["twitch-eventsub-message-type"] as string) === "revocation") {
            return TwitchEventMessageType.Revocation;
        } else {
            return TwitchEventMessageType.Notification;
        }
    }
}

export default TwitchController;
