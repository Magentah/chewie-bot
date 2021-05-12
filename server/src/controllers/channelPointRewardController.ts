import { inject, injectable } from "inversify";
import { Request, Response } from "express";
import HttpStatusCodes from "http-status-codes";
import { ChannelPointRewardService } from "../services";
import { Logger, LogType } from "../logger";
import { ChannelPointRedemption } from "../models";

@injectable()
export default class ChannelPointRewardController {
    constructor(@inject(ChannelPointRewardService) private channelPointRewardService: ChannelPointRewardService) {
        // Empty
    }

    public async addAssociation(req: Request, res: Response): Promise<void> {
        try {
            await this.channelPointRewardService.addChannelRewardRedemption(req.body.rewardEvent, req.body.channelPointRedemption);
        } catch (error: any) {
            Logger.err(LogType.Twitch, "Error occured in addAssociation.", error);
            res.sendStatus(HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
        res.sendStatus(HttpStatusCodes.OK);
    }

    public async getChannelRewards(req: Request, res: Response): Promise<void> {
        try {
            const channelRewards = await this.channelPointRewardService.getChannelRewardsForBroadcaster();
            res.status(HttpStatusCodes.OK).send(channelRewards);
        } catch (error: any) {
            Logger.err(LogType.Twitch, "Error occured in getChannelRewards", error);
            res.sendStatus(HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }

    public async getCurrentAssociations(req: Request, res: Response): Promise<void> {
        try {
            const associations = await this.channelPointRewardService.getAllChannelRewards();
            res.status(HttpStatusCodes.OK).send(associations);
        } catch (error: any) {
            Logger.err(LogType.Twitch, "Error occured in getCurrentAssociations", error);
            res.sendStatus(HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }

    public async getRewardEvents(req: Request, res: Response): Promise<void> {
        try {
            res.status(HttpStatusCodes.OK).send(Object.keys(ChannelPointRedemption));
        } catch (error: any) {
            Logger.err(LogType.Twitch, "Error occured in getRewardEvents", error);
            res.sendStatus(HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
}
