import { inject, injectable } from "inversify";
import { DatabaseProvider, DatabaseTables } from "../services";
import { IChannelPointRewardHistory, ChannelPointRedemption } from "../models";

@injectable()
export default class ChannelPointRewardHistoryRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }
    //TODO: Move channel point reward / event things to a single table. Use enum ChannelPointRedemptions for events instead.
    public async getAll(): Promise<IChannelPointRewardHistory[]> {
        const databaseService = await this.databaseProvider();
        const channelPointRewards = await databaseService.getQueryBuilder(DatabaseTables.ChannelPointRewardHistory).select("*");
        return channelPointRewards;
    }

    public async getForRedemption(redemption: ChannelPointRedemption): Promise<IChannelPointRewardHistory> {
        const databaseService = await this.databaseProvider();
        const channelPointReward = await databaseService
            .getQueryBuilder(DatabaseTables.ChannelPointRewardHistory)
            .select("*")
            .where("associatedRedemption", redemption);
        return channelPointReward;
    }

    public async add(channelPointReward: IChannelPointRewardHistory): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.ChannelPointRewardHistory).insert(channelPointReward);
    }
}
