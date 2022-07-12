import { inject, injectable } from "inversify";
import { Request, Response } from "express";
import HttpStatusCodes from "http-status-codes";
import { ChannelPointRewardService } from "../services";
import { Logger, LogType } from "../logger";
import { ChannelPointRedemption, ITwitchChannelReward } from "../models";

@injectable()
export default class ChannelPointRewardController {
    constructor(@inject(ChannelPointRewardService) private channelPointRewardService: ChannelPointRewardService) {
        // Empty
    }

    public async addAssociation(req: Request, res: Response): Promise<void> {
        try {
            await this.channelPointRewardService.addChannelRewardRedemption(req.body.rewardEvent, req.body.channelPointRedemption);
            res.sendStatus(HttpStatusCodes.OK);
        } catch (error: any) {
            Logger.err(LogType.Twitch, "Error occured in addAssociation.", error);
            res.sendStatus(HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }

    public async getChannelRewards(req: Request, res: Response): Promise<void> {
        try {
            const channelRewards = await this.channelPointRewardService.getChannelRewardsForBroadcaster();
            res.status(HttpStatusCodes.OK).send(channelRewards);
        } catch (error: any) {
            Logger.err(LogType.Twitch, "Error occured in getChannelRewards", error);
            res.status(HttpStatusCodes.OK);

            // Return something for now. Taken from documentation page.
            res.send([{
                "broadcaster_name": "torpedo09",
                "broadcaster_login": "torpedo09",
                "broadcaster_id": "274637212",
                "id": "92af127c-7326-4483-a52b-b0da0be61c01",
                "image": null,
                "background_color": "#00E5CB",
                "is_enabled": true,
                "cost": 50000,
                "title": "game analysis",
                "prompt": "",
                "is_user_input_required": false,
                "max_per_stream_setting": {
                    "is_enabled": false,
                    "max_per_stream": 0,
                },
                "max_per_user_per_stream_setting": {
                    "is_enabled": false,
                    "max_per_user_per_stream": 0,
                },
                "global_cooldown_setting": {
                    "is_enabled": false,
                    "global_cooldown_seconds": 0,
                },
                "is_paused": false,
                "is_in_stock": true,
                "default_image": {
                    "url_1x": "https://static-cdn.jtvnw.net/custom-reward-images/default-1.png",
                    "url_2x": "https://static-cdn.jtvnw.net/custom-reward-images/default-2.png",
                    "url_4x": "https://static-cdn.jtvnw.net/custom-reward-images/default-4.png",
                },
                "should_redemptions_skip_request_queue": false,
                "redemptions_redeemed_current_stream": null,
                "cooldown_expires_at": null,
            }]);
        }
    }

    public getRedemptions(req: Request, res: Response): void {
        try {
            res.status(HttpStatusCodes.OK).send(Object.values(ChannelPointRedemption));
        } catch (error: any) {
            Logger.err(LogType.Twitch, "Error occured in getRedemptions", error);
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

    public async deleteAssociation(req: Request, res: Response): Promise<void> {
        try {
            if (req.query && req.query.id) {
                const id: number = Number.parseInt(req.query.id.toString(), 10);
                await this.channelPointRewardService.deleteChannelRewardRedemption(id);
            }
            res.sendStatus(HttpStatusCodes.OK);
        } catch (error: any) {
            Logger.err(LogType.Twitch, "Error in deleteAssociation", error);
            res.sendStatus(HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }

    public async addChannelReward(req: Request, res: Response): Promise<void> {
        try {
            const channelReward = await this.channelPointRewardService.createChannelReward(req.body.title, req.body.cost, req.body.associatedRedemption);
            res.status(HttpStatusCodes.OK).send(channelReward);
        } catch (error: any) {
            Logger.err(LogType.Twitch, "Error in addChannelReward", error);
            res.sendStatus(HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
}
