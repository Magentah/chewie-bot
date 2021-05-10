import { inject, injectable } from "inversify";
import { Request, Response } from "express";
import HttpStatusCodes from "http-status-codes";
import TwitchChannelPointRewardService from "../services/twitchChannelPointRewardService";
import { Logger, LogType } from "../logger";
import RewardEventsRepository from "../database/rewardEventsRepository";

@injectable()
export default class ChannelPointRewardController {
    constructor(
        @inject(TwitchChannelPointRewardService) private channelPointRewardService: TwitchChannelPointRewardService,
        @inject(RewardEventsRepository) private rewardEventsRepository: RewardEventsRepository
    ) {
        // Empty
    }

    public async addAssociation(req: Request, res: Response): Promise<void> {
        try {
            await this.channelPointRewardService.addEventAssociation(req.body.rewardEvent, req.body.channelPointReward);
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
            const associations = await this.channelPointRewardService.getAllEventAssociations();
            res.status(HttpStatusCodes.OK).send(associations);
        } catch (error: any) {
            Logger.err(LogType.Twitch, "Error occured in getCurrentAssociations", error);
            res.sendStatus(HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }

    public async getRewardEvents(req: Request, res: Response): Promise<void> {
        try {
            const rewardEvents = await this.rewardEventsRepository.getAll();
            res.status(HttpStatusCodes.OK).send(rewardEvents);
        } catch (error: any) {
            Logger.err(LogType.Twitch, "Error occured in getRewardEvents", error);
            res.sendStatus(HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
}
