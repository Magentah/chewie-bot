import { inject, injectable } from "inversify";
import { DatabaseProvider, DatabaseTables } from "../services";
import { IChannelPointReward, ChannelPointRedemption } from "../models";

@injectable()
export default class ChannelPointRewardRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }
    //TODO: Move channel point reward / event things to a single table. Use enum ChannelPointRedemptions for events instead.
    public async getAll(): Promise<IChannelPointReward[]> {
        const databaseService = await this.databaseProvider();
        const channelPointRewards = await databaseService.getQueryBuilder(DatabaseTables.ChannelPointRewards).select("*");
        return channelPointRewards;
    }

    public async getForRedemption(redemption: ChannelPointRedemption): Promise<IChannelPointReward> {
        const databaseService = await this.databaseProvider();
        const channelPointReward = await databaseService
            .getQueryBuilder(DatabaseTables.ChannelPointRewards)
            .first("*")
            .where("associatedRedemption", redemption)
            .andWhere("isEnabled", true);
        return channelPointReward;
    }

    public async add(channelPointReward: IChannelPointReward): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.ChannelPointRewards).insert(channelPointReward);
    }

    public async update(channelPointReward: IChannelPointReward): Promise<void> {
        if (channelPointReward.id) {
            const databaseService = await this.databaseProvider();
            await databaseService.getQueryBuilder(DatabaseTables.ChannelPointRewards).update(channelPointReward).where("id", channelPointReward.id);
        }
    }
}
