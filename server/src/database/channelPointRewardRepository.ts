import { inject, injectable } from "inversify";
import { DatabaseProvider, DatabaseTables } from "../services";
import { IChannelPointReward, ChannelPointRedemption, ITwitchChannelReward } from "../models";

@injectable()
export default class ChannelPointRewardRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    /**
     * Gets all ChannelPointRewards that have an associated redemption.
     */
    public async getAll(): Promise<IChannelPointReward[]> {
        const databaseService = await this.databaseProvider();
        const channelPointRewards = await databaseService.getQueryBuilder(DatabaseTables.ChannelPointRewards).select("*");
        return channelPointRewards;
    }

    /**
     * Gets the Twitch Channel Point Reward associated with a redemption.
     * @param redemption The redemption to get the Twitch Channel Point Reward for.
     * @returns A ChannelPointReward if one exists, undefined if there is none.
     */
    public async getForRedemption(redemption: ChannelPointRedemption): Promise<IChannelPointReward | undefined> {
        const databaseService = await this.databaseProvider();
        const channelPointReward = await databaseService
            .getQueryBuilder(DatabaseTables.ChannelPointRewards)
            .first("*")
            .where("associatedRedemption", redemption)
            .andWhere("isEnabled", true);
        return channelPointReward;
    }

    /**
     * Gets a ChannelPointReward object containing the redemption for a Twitch Channel Point Reward.
     * @param channelPointReward The Twitch Channel Point Reward to search for.
     * @returns The ChannelPointReward object if it exists, undefined if it does not.
     */
    public async getReward(channelPointReward: ITwitchChannelReward): Promise<IChannelPointReward | undefined> {
        const databaseService = await this.databaseProvider();
        const reward = await databaseService.getQueryBuilder(DatabaseTables.ChannelPointRewards).first("*").where("twitchRewardId", channelPointReward.id);
        return reward;
    }

    /**
     * Adds a redemption to a Twitch Channel Point Reward. A redemption is used to trigger additional functionality, such as Tax Events when
     * a user redeems a specific reward, or add bot points.
     * @param channelPointReward The Twitch Channel Point Reward that will be redeemed with the redemption associated with it.
     */
    public async add(channelPointReward: IChannelPointReward): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.ChannelPointRewards).insert(channelPointReward);
    }

    /**
     * Update an existing ChannelPointReward.
     * @param channelPointReward The ChannelPointReward to update.
     */
    public async update(channelPointReward: IChannelPointReward): Promise<void> {
        if (channelPointReward.id) {
            const databaseService = await this.databaseProvider();
            await databaseService.getQueryBuilder(DatabaseTables.ChannelPointRewards).update(channelPointReward).where("id", channelPointReward.id);
        }
    }
}
