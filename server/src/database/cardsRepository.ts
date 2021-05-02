import { inject, injectable } from "inversify";
import { DatabaseTables, DatabaseProvider } from "../services/databaseService";
import { IUserCard } from "../models";

@injectable()
export default class CardsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async getList(): Promise<IUserCard[]> {
        const databaseService = await this.databaseProvider();
        const cards = await databaseService.getQueryBuilder(DatabaseTables.Cards);
        return cards as IUserCard[];
    }

    public async get(card: IUserCard): Promise<IUserCard | undefined> {
        if (!card.id) {
            return undefined;
        }

        const databaseService = await this.databaseProvider();
        const cards = await databaseService.getQueryBuilder(DatabaseTables.Cards).where({ id: card.id }).first();
        return cards as IUserCard;
    }

    public async addOrUpdate(card: IUserCard): Promise<IUserCard> {
        const existingMessage = await this.get(card);
        if (!existingMessage) {
            const databaseService = await this.databaseProvider();
            const result = await databaseService.getQueryBuilder(DatabaseTables.Cards).insert(card);
            card.id = result[0];
            return card;
        } else {
            const databaseService = await this.databaseProvider();
            await databaseService.getQueryBuilder(DatabaseTables.Cards).where({ id: card.id }).update(card);
            return card;
        }
    }

    public async delete(card: IUserCard): Promise<boolean> {
        const databaseService = await this.databaseProvider();
        if (card.id) {
            await databaseService
                .getQueryBuilder(DatabaseTables.Cards)
                .where({ id: card.id })
                .delete();
            return true;
        }

        return false;
    }

    public getFileExt(mimetype: string): string | undefined {
        switch (mimetype.toLowerCase()) {
            case "image/jpeg": return "jpg";
            case "image/png": return "png";
        }

        return undefined;
    }
}
