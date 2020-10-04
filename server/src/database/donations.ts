import { inject, injectable } from "inversify";
import { DatabaseProvider, DatabaseTables } from "../services/databaseService";
import { IDonation } from "../models";

@injectable()
export class DonationsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async get(username: string): Promise<IDonation[]> {
        const databaseService = await this.databaseProvider();
        const userLevel = await databaseService.getQueryBuilder(DatabaseTables.TextCommands).where({ username });
        return userLevel as IDonation[];
    }

    public async add(donation: IDonation): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.TextCommands).insert(donation);
    }
}

export default DonationsRepository;
