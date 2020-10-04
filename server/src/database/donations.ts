import { inject, injectable } from "inversify";
import { DatabaseService, DatabaseTables } from "../services/databaseService";
import { IDonation } from "../models";

@injectable()
export class DonationsRepository {
    constructor(@inject(DatabaseService) private databaseService: DatabaseService) {
        // Empty
    }

    public async get(username: string): Promise<IDonation[]> {
        const userLevel = await this.databaseService.getQueryBuilder(DatabaseTables.TextCommands).where({ username });
        return userLevel as IDonation[];
    }

    public async add(donation: IDonation): Promise<void> {
        await this.databaseService.getQueryBuilder(DatabaseTables.TextCommands).insert(donation);
    }
}

export default DonationsRepository;
