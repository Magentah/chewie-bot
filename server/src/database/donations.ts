<<<<<<< HEAD:src/database/donations.ts
import { inject, injectable } from 'inversify';
import { Tables, DatabaseProvider } from '../services/databaseService';
import { IDonation } from '../models/donation';
=======
import { inject, injectable } from "inversify";
import DatabaseService, { Tables } from "../services/databaseService";
import { IDonation } from "../models/donation";
>>>>>>> upstream-tmp:server/src/database/donations.ts

@injectable()
export class DonationsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async get(username: string): Promise<IDonation[]> {
        const databaseService = await this.databaseProvider();
        const userLevel = await databaseService.getQueryBuilder(Tables.TextCommands).where({ username });
        return userLevel as IDonation[];
    }

    public async add(donation: IDonation): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(Tables.TextCommands).insert(donation);
    }
}

export default DonationsRepository;
