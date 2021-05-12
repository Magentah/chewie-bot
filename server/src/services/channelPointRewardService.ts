import { inject, injectable, LazyServiceIdentifer } from "inversify";
import TwitchWebService from "./twitchWebService";
import { IChannelPointReward, ChannelPointRedemption, ITwitchChannelReward, IChannelPointRewardHistory } from "../models";
import ChannelPointRewardRepository from "../database/channelPointRewardRepository";
import ChannelPointRewardHistoryRepository from "../database/channelPointRewardHistoryRepository";

@injectable()
export default class ChannelPointRewardService {
    constructor(
        @inject(TwitchWebService) private twitchWebService: TwitchWebService,
        @inject(ChannelPointRewardRepository) private channelPointRewardRepository: ChannelPointRewardRepository,
        @inject(ChannelPointRewardHistoryRepository) private channelPointRewardHistoryRepository: ChannelPointRewardHistoryRepository
    ) {
        // Empty
    }

    /**
     * Gets the Twitch Channel Point Rewards for the configured broadcaster.
     * @returns A list of the Twitch Channel Point Rewards.
     */
    public async getChannelRewardsForBroadcaster(): Promise<ITwitchChannelReward[]> {
        const rewards = await this.twitchWebService.getChannelRewards();
        return rewards;
    }

    /**
     * Adds a redemption to a Twitch Channel Point Reward. A redemption is used to trigger additional functionality, such as Tax Events when
     * a user redeems a specific reward, or add bot points.
     * @param channelPointReward The Twitch Channel Point Reward that will be redeemed.
     * @param redemption The redemption to associate with the Twitch Channel Point Reward
     */
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
            isDeleted: false,
        };

        await this.channelPointRewardRepository.add(newChannelRewardRedemption);
    }

    /**
     * Gets the Twitch Channel Point Reward associated with a redemption.
     * @param redemption The redemption to get the Twitch Channel Point Reward for.
     * @returns A ChannelPointReward if one exists, undefined if there is none.
     */
    public async getChannelRewardForRedemption(redemption: ChannelPointRedemption): Promise<IChannelPointReward | undefined> {
        return await this.channelPointRewardRepository.getForRedemption(redemption);
    }

    /**
     * Gets all Twitch Channel Point Rewards that have a redemption.
     * @returns A list of ChannelPointRewards.
     */
    public async getAllChannelRewards(): Promise<IChannelPointReward[]> {
        return await this.channelPointRewardRepository.getAll();
    }

    /**
     * Gets a ChannelPointReward object containing the redemption for a Twitch Channel Point Reward.
     * @param channelPointReward The Twitch Channel Point Reward to search for.
     * @returns The ChannelPointReward object if it exists, undefined if it does not.
     */
    public async getChannelReward(channelPointReward: ITwitchChannelReward): Promise<IChannelPointReward | undefined> {
        return await this.channelPointRewardRepository.getReward(channelPointReward);
    }

    /**
     * Adds a Twitch Channel Point Reward event to the history database table, with the associated redemption.
     * @param channelPointReward The Twitch Channel Point Reward that was triggered.
     * @param userId The id of the user that triggered the reward.
     */
    public async channelPointRewardRedemptionTriggered(channelPointReward: ITwitchChannelReward, userId: number): Promise<void> {
        const reward = await this.getChannelReward(channelPointReward);
        if (reward?.associatedRedemption) {
            const now = new Date(Date.now());
            const channelPointRewardHistoryEntry: IChannelPointRewardHistory = {
                associatedRedemption: reward?.associatedRedemption,
                rewardId: channelPointReward.id,
                timeTriggered: now,
                userId,
            };

            await this.channelPointRewardHistoryRepository.add(channelPointRewardHistoryEntry);
        }
    }

    public async deleteChannelRewardRedemption(channelPointRewardId: number): Promise<void> {
        await this.channelPointRewardRepository.delete(channelPointRewardId);
    }
}
