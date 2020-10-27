import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { Logger, LogType } from "../logger";
import { TwitchService } from "../services";

@injectable()
class TwitchController {
    constructor(@inject(TwitchService) private twitchService: TwitchService) {
        Logger.info(LogType.ServerInfo, "TwitchController Constructor");
    }

    public joinChannel(req: Request, res: Response): void {
        this.twitchService.defaultBotJoinChannel(`#${req.params.channel}`);
        res.sendStatus(StatusCodes.OK);
    }

    public leaveChannel(req: Request, res: Response): void {
        this.twitchService.leaveChannel(`#${req.params.channel}`);
        res.sendStatus(StatusCodes.OK);
    }

    public createClient(req: Request, res: Response): void {
        if (req.body.username === undefined || req.body.oauth === undefined) {
            this.twitchService.defaultBotJoinChannel(`#${req.params.channel}`);
        } else {
            this.twitchService.setupClientForChannel(`#${req.params.channel}`, req.body.username, req.body.oauth);
        }
        res.sendStatus(StatusCodes.OK);
    }
}

export default TwitchController;
