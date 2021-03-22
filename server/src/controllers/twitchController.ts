import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { ResponseStatus } from "../models";
import { Logger, LogType } from "../logger";
import { TwitchServiceProvider, BotSettingsService, TwitchEventService, StreamlabsService } from "../services";
import { ITwitchProfile } from "../strategy/twitchStrategy";
import { BotSettings } from "../services/botSettingsService";

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
        @inject(TwitchEventService) private twitchEventService: TwitchEventService,
        @inject(StreamlabsService) private streamlabsService: StreamlabsService
    ) {
        // Empty
    }
    public async getStatus(req: Request, res: Response): Promise<void> {
        const twitchService = await this.twitchProvider();
        res.status(StatusCodes.OK).send(twitchService.getStatus());
    }

    public async connect(req: Request, res: Response): Promise<void> {
        try {
            const twitchService = await this.twitchProvider();
            twitchService.connect();

            // Attempts to connect to the streamlabs socket on bot connection.
            // TODO: Might be a good idea to change this? Maybe have the bot just connect to the websocket on
            // startup if there's a token for the configured broadcaster? Not sure.
            if (req.user) {
                const user: ITwitchProfile = req.user as ITwitchProfile;
                await this.streamlabsService.connectOnStartup(user);
            }

            res.sendStatus(StatusCodes.OK);
        } catch (error) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(error);
        }
    }

    public async disconnect(req: Request, res: Response): Promise<void> {
        try {
            const twitchService = await this.twitchProvider();
            twitchService.disconnect();
            this.streamlabsService.disconnect();
            res.sendStatus(StatusCodes.OK);
        } catch (error) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(error);
        }
    }

    public async getBotSettings(req: Request, res: Response): Promise<void> {
        const user = await this.botSettingsService.getSettings(BotSettings.BotUsername);
        const auth = await this.botSettingsService.getSettings(BotSettings.BotUserAuth);
        res.status(StatusCodes.OK).send({username: user.value, oauth: auth.value});
    }

    public async saveBotSettings(req: Request, res: Response): Promise<void> {
        try {
            await this.botSettingsService.addOrUpdateSettings({
                key: BotSettings.BotUsername,
                value: req.body.username,
            });
            await this.botSettingsService.addOrUpdateSettings({
                key: BotSettings.BotUserAuth,
                value: req.body.oauth,
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
        const subscriptions = await this.twitchEventService.getSubscriptions();
        res.status(StatusCodes.OK).send(subscriptions);
    }

    public async subscribeEventSub(req: Request, res: Response): Promise<void> {
        await this.twitchEventService.subscribeEvent(req.body.event, req.body.userId);
        res.sendStatus(StatusCodes.ACCEPTED);
    }

    public async deleteInactiveSubscriptions(req: Request, res: Response): Promise<void> {
        await this.twitchEventService.deleteInactiveSubscriptions();
        res.sendStatus(StatusCodes.OK);
    }

    public async deleteAllSubscriptions(req: Request, res: Response): Promise<void> {
        await this.twitchEventService.deleteAllSubscriptions();
        res.sendStatus(StatusCodes.OK);
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
