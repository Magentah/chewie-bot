import { inject, injectable } from 'inversify';
import DatabaseService, { Tables } from '../services/databaseService';
import { IDonation } from '../models/donation';

@injectable()
export class DonationsRepository {
    constructor(@inject(DatabaseService) private databaseService: DatabaseService) {
        // Empty
    }

    public async get(username: string): Promise<IDonation[]> {
        const userLevel = await this.databaseService.getQueryBuilder(Tables.TextCommands).where({ username });
        return userLevel as IDonation[];
    }

    public async add(donation: IDonation): Promise<void> {
        await this.databaseService.getQueryBuilder(Tables.TextCommands).insert(donation);
    }
}

export default DonationsRepository;
