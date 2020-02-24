import { inject, injectable } from 'inversify';
import { Tables, DatabaseProvider } from '../services/databaseService';
import { IDonation } from '../models/donation';

@injectable()
export class DonationsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async get(username: string): Promise<IDonation[]> {
<<<<<<< HEAD
        const databaseService = await this.databaseProvider();
        const userLevel = await databaseService.getQueryBuilder(Tables.TextCommands).where({ username });
=======
        const databaseService = this.databaseProvider();
        const userLevel = await this.databaseService.getQueryBuilder(Tables.TextCommands).where({ username });
>>>>>>> 4a5ebff5151ef3b9986e95a79943047b45dc9fc5
        return userLevel as IDonation[];
    }

    public async add(donation: IDonation): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(Tables.TextCommands).insert(donation);
    }
}

export default DonationsRepository;
