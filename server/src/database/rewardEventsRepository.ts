import { inject, injectable } from "inversify";
import { DatabaseProvider, DatabaseTables } from "../services/databaseService";

export interface IDBRewardEvent {
    id?: number;
    name: string;
}

@injectable()
export default class RewardEventsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async get(name: string): Promise<IDBRewardEvent | undefined> {
        const databaseService = await this.databaseProvider();
        const returnRewardEvent = await databaseService.getQueryBuilder(DatabaseTables.RewardEvents).first("name", "like", name);
        return returnRewardEvent;
    }

    public async add(name: string): Promise<IDBRewardEvent> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.RewardEvents).insert({ name });
        const returnRewardEvent = await this.get(name);
        return returnRewardEvent as IDBRewardEvent;
    }
}
