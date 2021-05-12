import { inject, injectable, LazyServiceIdentifer } from "inversify";
import TwitchWebService from "./twitchWebService";
import { IChannelPointReward, ChannelPointRedemption, ITwitchChannelReward } from "../models";
import ChannelPointRewardRepository from "../database/channelPointRewardRepository";

@injectable()
export default class ChannelPointRewardService {
    constructor(
        @inject(TwitchWebService) private twitchWebService: TwitchWebService,
        @inject(ChannelPointRewardRepository) private channelPointRewardRepository: ChannelPointRewardRepository
    ) {
        // Empty
    }

    public async getChannelRewardsForBroadcaster(): Promise<ITwitchChannelReward[]> {
        const rewards = await this.twitchWebService.getChannelRewards();
        return rewards;
    }

    public async addChannelRewardRedemption(channelPointReward: ITwitchChannelReward, redemption: ChannelPointRedemption): Promise<void> {
        const newChannelRewardRedemption: IChannelPointReward = {
            twitchRewardId: channelPointReward.id,
            title: channelPointReward.title,
            cost: channelPointReward.cost,
            isEnabled: channelPointReward.is_enabled,
            isGlobalCooldownEnabled: channelPointReward.global_cooldown_setting.is_enabled,
            globalCooldown: channelPointReward.global_cooldown_setting.global_cooldown_seconds,
            shouldSkipRequestQueue: channelPointReward.should_redemptions_skip_request_queue,
            associatedRedemption: redemption,
        };

        await this.channelPointRewardRepository.add(newChannelRewardRedemption);
    }

    public async getChannelReward(redemption: ChannelPointRedemption): Promise<IChannelPointReward> {
        return await this.channelPointRewardRepository.getForRedemption(redemption);
    }

    public async getAllChannelRewards(): Promise<IChannelPointReward[]> {
        return await this.channelPointRewardRepository.getAll();
    }
}
