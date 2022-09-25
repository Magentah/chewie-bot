import { inject, injectable } from "inversify";
import { DatabaseTables, DatabaseProvider } from "../services/databaseService";
import { ICommandRedemption } from "../models";

@injectable()
export default class RedemptionsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async getList(): Promise<ICommandRedemption[]> {
        const databaseService = await this.databaseProvider();
        const results = await databaseService.getQueryBuilder(DatabaseTables.CommandRedemptions);
        return results as ICommandRedemption[];
    }

    public async get(redemption: ICommandRedemption): Promise<ICommandRedemption | undefined> {
        if (!redemption.id) {
            return undefined;
        }

        const databaseService = await this.databaseProvider();
        const results = await databaseService.getQueryBuilder(DatabaseTables.CommandRedemptions).where({ id: redemption.id }).first();
        return results as ICommandRedemption;
    }

    public async getByName(redemption: string): Promise<ICommandRedemption | undefined> {
        const databaseService = await this.databaseProvider();
        const results = await databaseService.getQueryBuilder(DatabaseTables.CommandRedemptions).where({ name: redemption }).first();
        return results as ICommandRedemption;
    }

    public async addOrUpdate(redemption: ICommandRedemption): Promise<ICommandRedemption> {
        const existingItem = await this.get(redemption);
        if (!existingItem) {
            const databaseService = await this.databaseProvider();
            const result = await databaseService.getQueryBuilder(DatabaseTables.CommandRedemptions).insert(redemption);
            redemption.id = result[0];
            return redemption;
        } else {
            const databaseService = await this.databaseProvider();
            await databaseService.getQueryBuilder(DatabaseTables.CommandRedemptions).where({ id: redemption.id }).update(redemption);
            return redemption;
        }
    }

    public async delete(redemptions: ICommandRedemption): Promise<boolean> {
        const databaseService = await this.databaseProvider();
        if (redemptions.id) {
            await databaseService
                .getQueryBuilder(DatabaseTables.CommandRedemptions)
                .where({ id: redemptions.id })
                .delete();
            return true;
        }

        return false;
    }

    public getFileExt(mimetype: string): string | undefined {
        switch (mimetype.toLowerCase()) {
            case "image/jpeg": return "jpg";
            case "image/png": return "png";
            case "image/gif": return "gif";
            case "image/webp": return "webp";
        }

        return undefined;
    }

    public addUrl(x: { mimetype?: string, imageId: string }): any {
        return {...x, url: `/img/${x.imageId}.${this.getFileExt(x.mimetype ?? "")}` };
    }
}
