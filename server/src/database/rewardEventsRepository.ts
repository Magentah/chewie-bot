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

    //TODO: Ideally we should be able to create these rewards dynamically using some very simple script like language
    // That's a little out of scope at the moment though and would take a significant amount of time to implement.
    // Currently doing super simple implementations of this as there's not many to do and it's significantly faster.

    public async get(name: string): Promise<IDBRewardEvent | undefined> {
        const databaseService = await this.databaseProvider();
        const returnRewardEvent = await databaseService.getQueryBuilder(DatabaseTables.RewardEvents).first("name", "like", name);
        return returnRewardEvent;
    }

    public async getAll(): Promise<IDBRewardEvent[]> {
        const databaseService = await this.databaseProvider();
        const allRewardEvents = await databaseService.getQueryBuilder(DatabaseTables.RewardEvents).select("*");
        return allRewardEvents as IDBRewardEvent[];
    }

    public async add(name: string): Promise<IDBRewardEvent> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.RewardEvents).insert({ name });
        const returnRewardEvent = await this.get(name);
        return returnRewardEvent as IDBRewardEvent;
    }
}
