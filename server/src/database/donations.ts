import { inject, injectable } from "inversify";
import { DatabaseProvider, DatabaseTables } from "../services/databaseService";
import { IDonation } from "../models";
import BotSettingsService, { BotSettings } from "../services/botSettingsService";

@injectable()
export class DonationsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider,
                @inject(BotSettingsService) private settingsSerivce: BotSettingsService) {
        // Empty
    }

    public async get(username: string): Promise<IDonation[]> {
        const databaseService = await this.databaseProvider();
        const donations = await databaseService.getQueryBuilder(DatabaseTables.Donations).where({ username });
        return donations as IDonation[];
    }

    public async getAll(): Promise<IDonation[]> {
        const databaseService = await this.databaseProvider();
        const donations = await databaseService.getQueryBuilder(DatabaseTables.Donations);
        return donations as IDonation[];
    }

    public async add(donation: IDonation): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.Donations).insert(donation);

        // Delete all donations older than 5 weeks
        const pruneDays = parseInt(await this.settingsSerivce.getValue(BotSettings.PruneLogsAfterDays), 10);
        const pruneDate = new Date();
        pruneDate.setDate(-pruneDays);
        await databaseService.getQueryBuilder(DatabaseTables.Donations).where("date", "<", pruneDate).delete();
    }
}

export default DonationsRepository;
