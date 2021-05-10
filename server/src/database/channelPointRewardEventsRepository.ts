import { inject, injectable } from "inversify";
import { DatabaseProvider, DatabaseTables } from "../services/databaseService";
import { IDBChannelPointReward } from "./channelPointRewardsRepository";
import { IDBRewardEvent } from "./rewardEventsRepository";

@injectable()
export default class ChannelPointRewardEventsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    /**
     * Gets the channel point reward event associated with a reward event.
     * @param eventId The reward event id to get the channel point reward for.
     * @returns The channel point reward associated with a reward event or undefined if it doesn't exist.
     */
    public async getForEvent(rewardEventName: string): Promise<IDBChannelPointReward | undefined> {
        const databaseService = await this.databaseProvider();

        const channelReward = await databaseService
            .getQueryBuilder(DatabaseTables.ChannelPointRewardEvents)
            .join(
                DatabaseTables.ChannelPointRewards,
                `${DatabaseTables.ChannelPointRewards}.id`,
                `${DatabaseTables.ChannelPointRewardEvents}.channelPointRewardId`
            )
            .select(`${DatabaseTables.ChannelPointRewards}.*`)
            .where(`${DatabaseTables.ChannelPointRewardEvents}.name`, "like", rewardEventName);
        return channelReward as IDBChannelPointReward;
    }

    /**
     * Gets the reward event associated with a channel point reward.
     * @param rewardId The reward event to get.
     * @returns
     */
    public async getForChannelPointReward(channelPointRewardId: number): Promise<IDBRewardEvent | undefined> {
        const databaseService = await this.databaseProvider();
        const rewardEvent = await databaseService
            .getQueryBuilder(DatabaseTables.ChannelPointRewardEvents)
            .join(DatabaseTables.RewardEvents, `${DatabaseTables.RewardEvents}.id`, `${DatabaseTables.ChannelPointRewardEvents}.rewardEventId`)
            .select(`${DatabaseTables.RewardEvents}.*`)
            .where(`${DatabaseTables.ChannelPointRewardEvents}.channelPointRewardId`, channelPointRewardId);
        return rewardEvent;
    }

    /**
     * Add a channel point reward and reward event association.
     * @param rewardEventId The reward event id.
     * @param channelPointRewardId The channel point reward id.
     */
    public async addChannelRewardEvent(rewardEventId: number, channelPointRewardId: number): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.ChannelPointRewardEvents).insert({ rewardEventId, channelPointRewardId });
    }

    public async getAll(): Promise<any[]> {
        const databaseService = await this.databaseProvider();
        const allAssociations = await databaseService
            .getQueryBuilder(DatabaseTables.ChannelPointRewardEvents)
            .join(
                DatabaseTables.ChannelPointRewards,
                `${DatabaseTables.ChannelPointRewards}.id`,
                `${DatabaseTables.ChannelPointRewardEvents}.channelPointRewardId`
            )
            .join(DatabaseTables.RewardEvents, `${DatabaseTables.RewardEvents}.id`, `${DatabaseTables.ChannelPointRewardEvents}.rewardEventId`)
            .select("*");

        return allAssociations;
    }
}
