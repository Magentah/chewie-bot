import { inject, injectable } from "inversify";
import { DatabaseTables, DatabaseProvider } from "../services/databaseService";
import { ISonglistCategory, ISonglistItem, IUser } from "../models";
import { ISonglistTag } from "src/models/songlistItem";

@injectable()
export class SonglistRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async getList(userId: number | undefined): Promise<ISonglistItem[]> {
        const databaseService = await this.databaseProvider();
        const songlist = await databaseService
            .getQueryBuilder(DatabaseTables.Songlist)
            .leftJoin(DatabaseTables.Users, "songlist.attributedUserId", "users.id")
            .leftJoin(DatabaseTables.SonglistSongTags, "songlist.id", "songlistSongTags.songId")
            .leftJoin(DatabaseTables.SonglistCategories, "songlist.categoryId", "songlistCategories.id")
            .leftJoin(DatabaseTables.SonglistTags, "songlistTags.id", "songlistSongTags.tagId")
            .leftJoin(DatabaseTables.SonglistFavorites, (x) => {
                x.on("songlist.id", "songlistFavorites.songId")
                .andOnVal("songlistFavorites.userId", "=", userId ?? 0)
            })
            .orderBy("album")
            .orderBy("artist")
            .orderBy("title")
            .groupBy("songlist.id")
            .select(["songlist.*", "users.username AS attributedUsername", "songlistCategories.name AS genre",
                "songlistFavorites.id AS favoriteId", databaseService.raw("group_concat(songlistTags.name,';') AS songTags")
            ]);

        return songlist as ISonglistItem[];
    }

    public async getCategories(): Promise<ISonglistCategory[]> {
        const databaseService = await this.databaseProvider();
        const categories = await databaseService.getQueryBuilder(DatabaseTables.SonglistCategories).select().orderBy("sortOrder");
        return categories as ISonglistCategory[];
    }

    public async getTags(): Promise<ISonglistTag[]> {
        const databaseService = await this.databaseProvider();
        const tags = await databaseService.getQueryBuilder(DatabaseTables.SonglistTags).select();
        return tags as ISonglistTag[];
    }

    public async getRandom(searchTerm: string, filterFavorite?: IUser): Promise<ISonglistItem | undefined> {
        const databaseService = await this.databaseProvider();

        if (searchTerm) {
            // First take any random song from a given genre
            let query = databaseService
                .getQueryBuilder(DatabaseTables.Songlist)
                .leftJoin(DatabaseTables.SonglistCategories, "songlist.categoryId", "songlistCategories.id")
                .where("songlistCategories.name", "like", `%${searchTerm}%`)
                .leftJoin(DatabaseTables.SonglistFavorites, (x) => {
                    x.on("songlist.id", "songlistFavorites.songId")
                    .andOnVal("songlistFavorites.userId", "=", filterFavorite?.id ?? 0)
                })
                .orderByRaw("RANDOM()")
                .first();

            if (filterFavorite?.id) {
                query = query.whereNotNull("songlistFavorites.id");
            }

            const result = await query as ISonglistItem;
            if (result) {
                return result;
            }

            // Next, try a tag
            const tagId = await databaseService.getQueryBuilder(DatabaseTables.SonglistTags).where("name", "like", `%${searchTerm}%`).select("id").first();
            if (tagId && tagId.id) {
                query = databaseService.getQueryBuilder(DatabaseTables.Songlist)
                    .leftJoin(DatabaseTables.SonglistSongTags, "songlistSongTags.songId", "songlist.id")
                    .leftJoin(DatabaseTables.SonglistFavorites, (x) => {
                        x.on("songlist.id", "songlistFavorites.songId")
                        .andOnVal("songlistFavorites.userId", "=", filterFavorite?.id ?? 0)
                    })
                    .where("songlistSongTags.tagId", tagId.id)
                    .orderByRaw("RANDOM()")
                    .first();

                if (filterFavorite?.id) {
                    query = query.whereNotNull("songlistFavorites.id");
                }

                const resultTags = await query as ISonglistItem;
                if (resultTags) {
                    return resultTags;
                }
            }

            // Otherwise any result that fits.
            query = databaseService.getQueryBuilder(DatabaseTables.Songlist)
                .where((bd) => bd.fulltextSearch(searchTerm, ["album", "title", "artist"]))
                .leftJoin(DatabaseTables.SonglistFavorites, (x) => {
                    x.on("songlist.id", "songlistFavorites.songId")
                    .andOnVal("songlistFavorites.userId", "=", filterFavorite?.id ?? 0)
                })
                .orderByRaw("RANDOM()")
                .first();

            if (filterFavorite?.id) {
                query = query.whereNotNull("songlistFavorites.id");
            }

            return await query;
        }

        let queryNoSearch = databaseService.getQueryBuilder(DatabaseTables.Songlist)
            .leftJoin(DatabaseTables.SonglistFavorites, (x) => {
                x.on("songlist.id", "songlistFavorites.songId")
                .andOnVal("songlistFavorites.userId", "=", filterFavorite?.id ?? 0)
            })
            .orderByRaw("RANDOM()")
            .first();

        if (filterFavorite?.id) {
            queryNoSearch = queryNoSearch.whereNotNull("songlistFavorites.id");
        }

        return await queryNoSearch as ISonglistItem;
    }

    public async get(id: number): Promise<ISonglistItem> {
        const databaseService = await this.databaseProvider();
        const title = await databaseService
            .getQueryBuilder(DatabaseTables.Songlist)
            .first()
            .where({ id });
        return title as ISonglistItem;
    }

    public async countAttributions(userId: number, sinceDate: Date = new Date(0)) : Promise<number> {
        const databaseService = await this.databaseProvider();
        const count = (await databaseService
            .getQueryBuilder(DatabaseTables.Songlist)
            .count("id AS cnt")
            .where({ attributedUserId: userId })
            .andWhere("created", ">=", sinceDate)
            .first()).cnt;
        return count;
    }

    public async add(item: ISonglistItem): Promise<ISonglistItem> {
        const databaseService = await this.databaseProvider();
        item.created = new Date();

        const tagIds = await this.getTagIds(item);

        const dbSong = {...item};
        delete dbSong.songTags;
        const result = await databaseService.getQueryBuilder(DatabaseTables.Songlist).insert(dbSong);

        item.id = result[0];

        for (const tagId of tagIds) {
            await this.linkSongTag(tagId, item.id);
        }

        return item;
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
        if (!item.id) {
            return;
        }

        // Create all necessary tags and get IDs
        const tagIds = await this.getTagIds(item);

        const dbSong = {...item};
        delete dbSong.songTags;

        const databaseService = await this.databaseProvider();
        await databaseService
            .getQueryBuilder(DatabaseTables.Songlist)
            .update(dbSong)
            .where({ id: item.id });

        // Link song to current tags
        await databaseService.getQueryBuilder(DatabaseTables.SonglistSongTags).delete().where("songId", item.id);
        for (const tagId of tagIds) {
            await this.linkSongTag(tagId, item.id);
        }

        await this.deleteUnusedTags();
    }

    private async getTagIds(item: ISonglistItem) {
        const tagIds = [];
        if (item.songTags) {
            if (typeof (item.songTags) === "string") {
                for (const tag of item.songTags.split(";")) {
                    tagIds.push(await this.createTag(tag));
                }
            } else {
                for (const tag of item.songTags) {
                    tagIds.push(await this.createTag(tag));
                }
            }
        }
        return tagIds;
    }

    public async linkSongTag(tagId: number, songId: number) {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.SonglistSongTags).insert({tagId, songId}).onConflict().ignore();
    }

    public async createTag(tag: string): Promise<number> {
        const databaseService = await this.databaseProvider();
        const tagId = await databaseService.getQueryBuilder(DatabaseTables.SonglistTags).select("id").where({name: tag}).first();
        if (tagId && tagId.id) {
            return tagId.id;
        }

        const result = await databaseService.getQueryBuilder(DatabaseTables.SonglistTags).insert({name: tag}).onConflict().ignore();
        return result[0];
    }

    private async deleteUnusedTags() {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.SonglistTags).delete().whereNotIn("id", (b) => b.select("tagId").distinct().from(DatabaseTables.SonglistSongTags));
    }

    public async delete(item: ISonglistItem | number): Promise<boolean> {
        const databaseService = await this.databaseProvider();
        if (typeof item === "number") {
            const toDelete = await this.get(item);
            if (toDelete) {
                await databaseService.getQueryBuilder(DatabaseTables.Songlist).delete().where({ id: toDelete.id });
                await this.deleteUnusedTags();
                return true;
            }
        } else if (item.id && this.get(item.id)) {
            await databaseService.getQueryBuilder(DatabaseTables.Songlist).delete().where({ id: item.id });
            await this.deleteUnusedTags();
            return true;
        }

        return false;
    }

    public async deleteCategory(item: ISonglistCategory) {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.SonglistCategories).delete().where({ id: item.id });
    }

    public async markFavorite(user: IUser, id: number | undefined) {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.SonglistFavorites).insert({userId: user.id, songId: id}).onConflict().ignore();
    }

    public async unmarkFavorite(user: IUser, id: number | undefined) {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.SonglistFavorites).delete().where({userId: user.id, songId: id});
    }
}

export default SonglistRepository;
