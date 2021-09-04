import { inject, injectable } from "inversify";
import { DatabaseTables, DatabaseProvider } from "../services/databaseService";
import { AchievementType, CardRarity, IUser, IUserCard } from "../models";
import EventAggregator from "../services/eventAggregator";
import { IUserCardOnStackInfo } from "../models/userCard";

@injectable()
export default class CardsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider,
                @inject(EventAggregator) private eventAggregator: EventAggregator,) {
        // Empty
    }

    public async getList(): Promise<IUserCard[]> {
        const databaseService = await this.databaseProvider();
        const cards = await databaseService.getQueryBuilder(DatabaseTables.Cards);
        return cards as IUserCard[];
    }

    public async getCount(): Promise<number> {
        const databaseService = await this.databaseProvider();
        return (await databaseService.getQueryBuilder(DatabaseTables.Cards).where("isUpgrade", false).count("id AS cardCount").first()).cardCount;
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
        const cards = await databaseService.getQueryBuilder(DatabaseTables.Cards).where("name", "LIKE", cardName).first();
        return cards as IUserCard;
    }

    public async getUpgradeCard(card: IUserCard): Promise<IUserCard | undefined> {
        const databaseService = await this.databaseProvider();
        const cards = await databaseService.getQueryBuilder(DatabaseTables.Cards).where("baseCardName", "LIKE", card.name).andWhere("isUpgrade", true).first();
        return cards as IUserCard;
    }

    public async getCountByCard(user: IUser, card: IUserCard): Promise<number> {
        const databaseService = await this.databaseProvider();
        return (await databaseService.getQueryBuilder(DatabaseTables.CardStack).where("cardId", card.id).andWhere("userId", user.id).count("id AS cardCount").first()).cardCount;
    }

    public async hasUpgrade(user: IUser, card: IUserCard): Promise<boolean> {
        const databaseService = await this.databaseProvider();
        return (await databaseService.getQueryBuilder(DatabaseTables.CardUpgrades).where("upgradeCardId", card.id)
            .andWhere("userId", user.id)
            .count("id AS upgradeCount").first()).upgradeCount > 0;
    }

    public async takeCardFromStack(user: IUser, cardName: string): Promise<number | undefined> {
        if (!cardName) {
            return undefined;
        }

        const databaseService = await this.databaseProvider();
        const card = (await databaseService.getQueryBuilder(DatabaseTables.Cards).where("name", "LIKE", cardName).first()) as IUserCard;
        if (!card) {
            return undefined;
        }

        const stack = (await databaseService.getQueryBuilder(DatabaseTables.CardStack).where({ userId: user.id, cardId: card.id, deleted: false }).select("id").first());
        if (stack && await databaseService.getQueryBuilder(DatabaseTables.CardStack).where({ id: stack.id }).update( { deleted: true }) > 0) {
            return stack.id;
        }

        return undefined;
    }

    public async takeCardsFromStack(user: IUser, card: IUserCard, count: number): Promise<number> {
        const databaseService = await this.databaseProvider();
        const query = databaseService.getQueryBuilder(DatabaseTables.CardStack);
        return await query.where("id", "in",
            databaseService.getQueryBuilder(DatabaseTables.CardStack).from(DatabaseTables.CardStack).where({ userId: user.id, cardId: card.id, deleted: false }).select("id").limit(count)
        ).update({ deleted: true });
    }

    public async returnCardToStack(user: IUser, stackId: number) {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.CardStack).where({ id: stackId }).first().update( { deleted: false });
    }

    public async getCardStack(user: IUser): Promise<IUserCardOnStackInfo[]> {
        const databaseService = await this.databaseProvider();
        const cards = (await databaseService.getQueryBuilder(DatabaseTables.CardStack).select()
            .join(DatabaseTables.Cards, "userCardStack.cardId", "userCards.id")
            .leftJoin(DatabaseTables.CardUpgrades, (x) => {
                x.on("userCardStack.cardId", "userCardUpgrades.upgradedCardId")
                .andOn("userCardStack.userId", "userCardUpgrades.userId")
            })
            .leftJoin(`${DatabaseTables.Cards} AS upgradeCards`, "userCardUpgrades.upgradeCardId", "upgradeCards.id")
            .groupBy("userCards.id")
            .where({ "userCardStack.userId": user.id, deleted: false })
            .orderBy("userCards.name")
            .select([
                "userCards.*",
                "upgradeCards.name AS upgradedName", "upgradeCards.imageId AS upgradedImagId", "upgradeCards.mimetype AS upgradedMimeType",
                databaseService.raw("COUNT(usercards.id) AS cardCount"),
            ])) as IUserCardOnStackInfo[];
        return cards;
    }

    public async getUniqueCardsCount(user: IUser): Promise<number> {
        const databaseService = await this.databaseProvider();
        const count = (await databaseService.getQueryBuilder(DatabaseTables.CardStack)
            .countDistinct("cardId AS cardCount")
            .where({ userId: user.id, deleted: false })
            .first()).cardCount;
        return count;
    }

    public async getUniqueUpgradesCount(user: IUser): Promise<number> {
        const databaseService = await this.databaseProvider();
        const count = (await databaseService.getQueryBuilder(DatabaseTables.CardUpgrades)
            .countDistinct("id as upgradeCount")
            .where({ userId: user.id })
            .first()).upgradeCount;
        return count;
    }

    public async addOrUpdate(card: IUserCard): Promise<IUserCard> {
        const existingMessage = await this.get(card);
        if (!existingMessage) {
            try {
                const databaseService = await this.databaseProvider();
                const result = await databaseService.getQueryBuilder(DatabaseTables.Cards).insert(card);
                card.id = result[0];
                return card;
            } catch (err: any) {
                if (err.code === "SQLITE_CONSTRAINT") {
                    throw new Error("Card with same name already exists.");
                }

                throw err;
            }
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
        // Exclude all card upgrades, since these can only be retrieved once.
        for (const rarity of rarities) {
            const card = await databaseService
                .getQueryBuilder(DatabaseTables.Cards)
                .where({rarity: rarity.rarity})
                .whereNotExists(databaseService.getQueryBuilder(DatabaseTables.CardUpgrades)
                    .select("id").from(DatabaseTables.CardUpgrades).where({ userId: user.id }).andWhereRaw("userCards.id = userCardUpgrades.upgradeCardId"))
                .first()
                .orderByRaw("RANDOM()") as IUserCard;
            if (card) {
                return card as IUserCard;
            }
        }

        return undefined;
    }

    public async saveCardUpgrade(user: IUser, upgradedCard: IUserCard, upgrade: IUserCard): Promise<void> {
        if (upgradedCard.id && user.id) {
            const databaseService = await this.databaseProvider();
            await databaseService.getQueryBuilder(DatabaseTables.CardUpgrades).insert({
                userId: user.id, upgradedCardId: upgradedCard.id, upgradeCardId: upgrade.id, dateUpgraded: new Date()
            });

            const count = await this.getUniqueUpgradesCount(user);
            this.eventAggregator.publishAchievement({ user, type: AchievementType.UniqueCardUpgrades, count });
        }
    }

    public async saveCardRedemption(user: IUser, card: IUserCard): Promise<void> {
        if (card.id && user.id) {
            await this.saveToCardStack(user, { cardId: card.id, userId: user.id, redemptionDate: new Date() });
        }
    }

    public async addCardToStack(user: IUser, cardName: string): Promise<void> {
        const card = await this.getByName(cardName);
        if (card && card.id && user.id) {
            await this.saveToCardStack(user, { cardId: card.id, userId: user.id, redemptionDate: 0 });
        }
    }

    private async saveToCardStack(user: IUser, card: { cardId: number, userId: number, redemptionDate: Date | number }) {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.CardStack).insert(card);
        const count = await this.getUniqueCardsCount(user);
        this.eventAggregator.publishAchievement({ user, type: AchievementType.UniqueCards, count });
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
