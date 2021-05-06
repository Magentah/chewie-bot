import { inject, injectable } from "inversify";
import { DatabaseTables, DatabaseProvider } from "../services/databaseService";
import { CardRarity, IUser, IUserCard } from "../models";

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

    public async redeemRandomCard(user: IUser): Promise<IUserCard | undefined> {
        // Rarity distribution is yet subject to change.
        const rarities = [
            {rarity: CardRarity.Common, value: 100 * Math.random()},
            {rarity: CardRarity.Uncommon, value: 50 * Math.random()},
            {rarity: CardRarity.Rare, value: 20 * Math.random()},
            {rarity: CardRarity.Mythical, value: 10 * Math.random()},
            {rarity: CardRarity.Legendary, value: 5 * Math.random()},
        ];

        rarities.sort((a, b) => a.value === b.value ? 0 : a.value > b.value ? -1 : 1)

        const databaseService = await this.databaseProvider();

        // Start with highest value and try finding cards.
        // Cards may not exist for all rarities, so we need to try multiple times possibly.
        for (const rarity of rarities) {
            const card = await databaseService
                .getQueryBuilder(DatabaseTables.Cards)
                .where({rarity: rarity.rarity})
                .first()
                .orderByRaw("RANDOM()") as IUserCard;
            if (card) {
                await databaseService.getQueryBuilder(DatabaseTables.CardStack).insert({ cardId: card.id, userId: user.id, redemptionDate: new Date() });
                return card as IUserCard;
            }
        }

        return undefined;
    }

    public async getRedeemedCardCount(user: IUser, date: Date): Promise<number> {
        function getDayStartingAtMonday(d: Date): number {
            const day = d.getDay();
            return day === 0 ? 6 : day -1;
        }

        const startOfWeek = new Date(date.toDateString());
        startOfWeek.setDate(startOfWeek.getDate() - getDayStartingAtMonday(date));

        const databaseService = await this.databaseProvider();
        const countResult = await databaseService
            .getQueryBuilder(DatabaseTables.CardStack)
            .count("id AS cnt")
            .where("redemptionDate", ">=", startOfWeek)
            .andWhere("userId", "=", user.id ?? 0)
            .first();

        return countResult.cnt as number;
    }

    public getFileExt(mimetype: string): string | undefined {
        switch (mimetype.toLowerCase()) {
            case "image/jpeg": return "jpg";
            case "image/png": return "png";
        }

        return undefined;
    }
}
