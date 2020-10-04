import { inject, injectable } from "inversify";
import { DatabaseService, DatabaseTables } from "../services/databaseService";
import { IVIPLevel } from "./../models";

@injectable()
export class VIPLevelsRepository {
    constructor(@inject(DatabaseService) private databaseService: DatabaseService) {
        // Empty
    }

    public async get(name: string): Promise<IVIPLevel> {
        const vipLevel = await this.databaseService.getQueryBuilder(DatabaseTables.VIPLevels).first().where({ name });
        return vipLevel as IVIPLevel;
    }

    public async add(name: string, rank: number): Promise<void> {
        await this.databaseService.getQueryBuilder(DatabaseTables.VIPLevels).insert({ name });
    }
}

export default VIPLevelsRepository;
