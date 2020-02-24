import { inject, injectable } from 'inversify';
import { Tables, DatabaseProvider } from '../services/databaseService';
import { IDonation } from '../models/donation';

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
