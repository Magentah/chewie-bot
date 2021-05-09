import { inject, injectable } from "inversify";
import { DatabaseProvider, DatabaseTables } from "../services/databaseService";

interface IDBChannelPointRewardEvent {
    id?: number;
    channelPointRewardId: number;
    rewardEventId: number;
}

@injectable()
export default class ChannelPointRewardEventsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async getForEvent(eventId: number): Promise<IDBChannelPointRewardEvent | undefined> {
        const databaseService = await this.databaseProvider();

        const channelReward = await databaseService.getQueryBuilder(DatabaseTables.ChannelPointRewardEvents).select("rewardEventId", eventId);
        return channelReward;
    }

    public async getForChannelPointReward(rewardId: number): Promise<IDBChannelPointRewardEvent | undefined> {
        const databaseService = await this.databaseProvider();
        const rewardEvent = await databaseService.getQueryBuilder(DatabaseTables.ChannelPointRewardEvents).select("channelPointRewardId", rewardId);
        return rewardEvent;
    }

    public async addChannelRewardEvent(eventId: number, rewardId: number): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.ChannelPointRewardEvents).insert({ rewardEventId: eventId, channelPointRewardId: rewardId });
    }
}
