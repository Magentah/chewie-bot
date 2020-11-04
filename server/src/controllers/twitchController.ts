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
        this.twitchService.joinChannel(`#${req.params.channel}`);
        res.sendStatus(StatusCodes.OK);
    }

    public leaveChannel(req: Request, res: Response): void {
        this.twitchService.leaveChannel(`#${req.params.channel}`);
        res.sendStatus(StatusCodes.OK);
    }

    public getStatus(req: Request, res: Response): void {
        res.status(StatusCodes.OK).send(this.twitchService.getStatus());
    }

    public connect(req: Request, res: Response): void {
        this.twitchService.connect();
        res.sendStatus(StatusCodes.OK);
    }

    public disconnect(req: Request, res: Response): void {
        this.twitchService.disconnect();
        res.sendStatus(StatusCodes.OK);
    }
}

export default TwitchController;
