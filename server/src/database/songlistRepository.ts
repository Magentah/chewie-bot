import { inject, injectable } from "inversify";
import { DatabaseTables, DatabaseProvider } from "../services/databaseService";
import { ISonglistItem } from "../models";

@injectable()
export class SonglistRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async getList(): Promise<ISonglistItem[]> {
        const databaseService = await this.databaseProvider();
        const songlist = await databaseService
            .getQueryBuilder(DatabaseTables.Songlist)
            .select();
        return songlist as ISonglistItem[];
    }

    public async get(id: number): Promise<ISonglistItem> {
        const databaseService = await this.databaseProvider();
        const title = await databaseService
            .getQueryBuilder(DatabaseTables.Songlist)
            .first()
            .where({ id });
        return title as ISonglistItem;
    }

    public async add(item: ISonglistItem): Promise<void> {
        const databaseService = await this.databaseProvider();
        item.created = new Date();
        await databaseService.getQueryBuilder(DatabaseTables.Songlist).insert(item);
    }

    public async update(item: ISonglistItem): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService
            .getQueryBuilder(DatabaseTables.Songlist)
            .update(item)
            .where({ id: item.id });
    }

    public async delete(item: ISonglistItem | number): Promise<boolean> {
        const databaseService = await this.databaseProvider();
        if (typeof item === "number") {
            const toDelete = await this.get(item);
            if (toDelete) {
                await databaseService.getQueryBuilder(DatabaseTables.Songlist).delete().where({ id: toDelete.id });
                return true;
            }
        } else if (item.id && this.get(item.id)) {
            await databaseService.getQueryBuilder(DatabaseTables.Songlist).delete().where({ id: item.id });
            return true;
        }

        return false;
    }
}

export default SonglistRepository;
