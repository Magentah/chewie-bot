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

    public async getCount(): Promise<number> {
        const databaseService = await this.databaseProvider();
        return (await databaseService.getQueryBuilder(DatabaseTables.Cards).count("id AS cnt").first()).cnt;
    }

    public async get(card: IUserCard): Promise<IUserCard | undefined> {
        if (!card.id) {
            return undefined;
        }

        const databaseService = await this.databaseProvider();
        const cards = await databaseService.getQueryBuilder(DatabaseTables.Cards).where({ id: card.id }).first();
        return cards as IUserCard;
    }

    public async getByName(cardName: string): Promise<IUserCard | undefined> {
        if (!cardName) {
            return undefined;
        }

        const databaseService = await this.databaseProvider();
        const cards = await databaseService.getQueryBuilder(DatabaseTables.Cards).where({ name: cardName }).first();
        return cards as IUserCard;
    }

    public async takeCardFromStack(user: IUser, cardName: string): Promise<number | undefined> {
        if (!cardName) {
            return undefined;
        }

        const databaseService = await this.databaseProvider();
        const card = (await databaseService.getQueryBuilder(DatabaseTables.Cards).where({ name: cardName }).first()) as IUserCard;
        if (!card) {
            return undefined;
        }

        const stack = (await databaseService.getQueryBuilder(DatabaseTables.CardStack).where({ userId: user.id, cardId: card.id, deleted: false }).select("id").first());
        if (stack && await databaseService.getQueryBuilder(DatabaseTables.CardStack).where({ id: stack.id }).update( { deleted: true }) > 0) {
            return stack.id;
        }

        return undefined;
    }

    public async returnCardToStack(user: IUser, stackId: number) {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.CardStack).where({ id: stackId }).first().update( { deleted: false });
    }

    public async getCardStack(user: IUser): Promise<IUserCard[]> {
        const databaseService = await this.databaseProvider();
        const cards = (await databaseService.getQueryBuilder(DatabaseTables.CardStack).select()
            .join(DatabaseTables.Cards, "userCards.id", "userCardStack.cardId")
            .groupBy("userCards.id")
            .where({ userId: user.id, deleted: false })
            .orderBy("userCards.name")
            .select([
                "userCards.*",
                databaseService.raw("COUNT(usercards.id) AS cardCount"),
            ])) as IUserCard[];
        return cards;
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

    public async deleteFromStack(card: IUserCard): Promise<boolean> {
        const databaseService = await this.databaseProvider();
        if (card.id) {
            await databaseService
                .getQueryBuilder(DatabaseTables.CardStack)
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
                return card as IUserCard;
            }
        }

        return undefined;
    }

    public async saveCardRedemption(user: IUser, card: IUserCard): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.CardStack).insert({ cardId: card.id, userId: user.id, redemptionDate: new Date() });
    }

    public async addCardToStack(user: IUser, cardName: string): Promise<void> {
        const card = await this.getByName(cardName);
        if (card) {
            const databaseService = await this.databaseProvider();
            await databaseService.getQueryBuilder(DatabaseTables.CardStack).insert({ cardId: card.id, userId: user.id, redemptionDate: 0 });
        }
    }

    public async getRedeemedCardCount(user: IUser, date: Date): Promise<number> {
        function getDayStartingAtMonday(d: Date): number {
            const day = d.getDay();
            return day === 0 ? 6 : day -1;
        }

        const startOfWeek = new Date(date.toDateString());
        startOfWeek.setDate(startOfWeek.getDate() - getDayStartingAtMonday(date));

        // For redeems, include deleted cards. Trading cards or redeeming sets
        // should not reset the number of cards redeemed per week.
        const databaseService = await this.databaseProvider();
        const countResult = await databaseService
            .getQueryBuilder(DatabaseTables.CardStack)
            .count("id AS cnt")
            .where("redemptionDate", ">=", startOfWeek)
            .andWhere("userId", "=", user.id ?? 0)
            .first();

        return countResult.cnt as number;
    }

    public async getLastRedeemedCard(user: IUser): Promise<number | undefined> {
        // Include deleted cards here since we need to consider
        // the entire redeem history.
        const databaseService = await this.databaseProvider();
        const countResult = await databaseService
            .getQueryBuilder(DatabaseTables.CardStack)
            .where("userId", "=", user.id ?? 0)
            .andWhere("redemptionDate", ">", 0)
            .orderBy("redemptionDate", "desc")
            .first("cardId");

        if (!countResult) {
            return undefined;
        }

        return countResult.cardId as number;
    }

    public getFileExt(mimetype: string): string | undefined {
        switch (mimetype.toLowerCase()) {
            case "image/jpeg": return "jpg";
            case "image/png": return "png";
        }

        return undefined;
    }
}
