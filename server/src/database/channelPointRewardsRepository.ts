import { inject, injectable } from "inversify";
import { DatabaseProvider, DatabaseTables } from "../services/databaseService";

export interface IDBChannelPointReward {
    id?: number;
    twitchRewardId: number;
    title: string;
    cost: number;
    isEnabled: boolean;
    isGlobalCooldownEnabled: boolean;
    globalCooldown?: number;
    shouldSkipRequestQueue: boolean;
}

@injectable()
export default class ChannelPointRewardsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async get(rewardTitle: string): Promise<IDBChannelPointReward | undefined> {
        const databaseService = await this.databaseProvider();

        const channelReward = await databaseService.getQueryBuilder(DatabaseTables.ChannelPointRewards).first("title", "like", rewardTitle);
        return channelReward;
    }

    public async getAll(): Promise<IDBChannelPointReward[]> {
        const databaseService = await this.databaseProvider();

        const channelRewards: IDBChannelPointReward[] = await databaseService.getQueryBuilder(DatabaseTables.ChannelPointRewards).select("*");
        return channelRewards;
    }

    public async add(channelPointReward: IDBChannelPointReward): Promise<IDBChannelPointReward> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.ChannelPointRewards).insert(channelPointReward).onConflict("title").merge();
        const returnReward = await this.get(channelPointReward.title);
        return returnReward as IDBChannelPointReward;
    }
}
