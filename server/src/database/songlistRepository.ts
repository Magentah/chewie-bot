import { inject, injectable } from "inversify";
import { DatabaseTables, DatabaseProvider } from "../services/databaseService";
import { ISonglistCategory, ISonglistItem } from "../models";

@injectable()
export class SonglistRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async getList(): Promise<ISonglistItem[]> {
        const databaseService = await this.databaseProvider();
        const songlist = await databaseService
            .getQueryBuilder(DatabaseTables.Songlist)
            .leftJoin(DatabaseTables.Users, "songlist.attributedUserId", "users.id")
            .orderBy("album")
            .orderBy("artist")
            .orderBy("title")
            .select(["songlist.*", "users.username AS attributedUsername"]);
        return songlist as ISonglistItem[];
    }

    public async getCategories(): Promise<ISonglistCategory[]> {
        const databaseService = await this.databaseProvider();
        const categories = await databaseService.getQueryBuilder(DatabaseTables.SonglistCategories).select().orderBy("sortOrder");
        return categories as ISonglistCategory[];
    }

    public async getRandom(searchTerm: string): Promise<ISonglistItem | undefined> {
        const databaseService = await this.databaseProvider();

        if (searchTerm) {
            // First take any random song from a given genre
            let result = await databaseService
                .getQueryBuilder(DatabaseTables.Songlist)
                .where("genre", "like", `%${searchTerm}%`)
                .orderByRaw("RANDOM()")
                .first() as ISonglistItem;

            if (result) {
                return result;
            }

            // Otherwise any result that fits.
            result = await databaseService
                .getQueryBuilder(DatabaseTables.Songlist)
                .where("album", "like", `%${searchTerm}%`)
                .orWhere("title", "like", `%${searchTerm}%`)
                .orderByRaw("RANDOM()")
                .first() as ISonglistItem;

            return result;
        }

        return await databaseService.getQueryBuilder(DatabaseTables.Songlist).orderByRaw("RANDOM()").first() as ISonglistItem;
    }

    public async get(id: number): Promise<ISonglistItem> {
        const databaseService = await this.databaseProvider();
        const title = await databaseService
            .getQueryBuilder(DatabaseTables.Songlist)
            .first()
            .where({ id });
        return title as ISonglistItem;
    }

    public async countAttributions(userId: number) : Promise<number> {
        const databaseService = await this.databaseProvider();
        const count = (await databaseService
            .getQueryBuilder(DatabaseTables.Songlist)
            .count("id AS cnt")
            .where({ attributedUserId: userId })
            .first()).cnt;
        return count;
    }

    public async add(item: ISonglistItem): Promise<void> {
        const databaseService = await this.databaseProvider();
        item.created = new Date();
        await databaseService.getQueryBuilder(DatabaseTables.Songlist).insert(item);
    }

    public async addCategory(newCategory: ISonglistCategory): Promise<ISonglistCategory> {
        const databaseService = await this.databaseProvider();
        const newOrder = await databaseService.getQueryBuilder(DatabaseTables.SonglistCategories).max("sortOrder AS sortOrder").first();
        newCategory.sortOrder = newOrder.sortOrder ? newOrder.sortOrder + 1 : 1;
        const result = await databaseService.getQueryBuilder(DatabaseTables.SonglistCategories).insert(newCategory);
        newCategory.id = result[0];
        return newCategory;
    }

    public async updateCategories(categories: ISonglistCategory[]) {
        const databaseService = await this.databaseProvider();
        for (const category of categories) {
            await databaseService.getQueryBuilder(DatabaseTables.SonglistCategories).update(category).where({ id: category.id });
        }
    }

    public async updateCategory(category: ISonglistCategory) {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.SonglistCategories).update(category).where({ id: category.id });
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

    public async deleteCategory(item: ISonglistCategory) {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.SonglistCategories).delete().where({ id: item.id });
    }
}

export default SonglistRepository;
