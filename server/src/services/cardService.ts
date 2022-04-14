import { inject, injectable } from "inversify";
import { IUserCard } from "../models";
import { BotSettings } from "./botSettingsService";
import { PointLogType } from "../models/pointLog";
import { Lang } from "../lang";
import UserService from "./userService";
import BotSettingsService from "./botSettingsService";
import CardsRepository from "../database/cardsRepository";

@injectable()
export default class CardService {
    constructor(
        @inject(BotSettingsService) private settingsService: BotSettingsService,
        @inject(CardsRepository) private cardsRepository: CardsRepository,
        @inject(UserService) private userService: UserService,
    ) {
    }

    public async redeemRandomCard(username: string): Promise<{card: IUserCard, pullsLeft: number | undefined} | string | undefined> {
        const user = await this.userService.getUser(username);
        if (!user) {
            return undefined;
        }

        if (await this.settingsService.getBoolValue(BotSettings.ReadonlyMode)) {
            return Lang.get("cards.readonlymode");
        }

        const cost = parseInt(await this.settingsService.getValue(BotSettings.CardRedeemCost), 10);
        if (cost > user.points) {
            return Lang.get("cards.insufficientpoints", user.username);
        }

        // Check if user already has redeemed too many cards this week.
        let pullsLeft;
        const cardsPerWeek = parseInt(await this.settingsService.getValue(BotSettings.CardRedeemPerWeek), 10);
        if (cardsPerWeek > 0) {
            const cardsRedeemed = await this.cardsRepository.getRedeemedCardCount(user, new Date());
            pullsLeft = cardsPerWeek - cardsRedeemed - 1;
            if (cardsRedeemed >= cardsPerWeek) {
                return Lang.get("cards.redeemlimitexceeded", user.username, cardsRedeemed);
            }
        }

        const lastCard = await this.cardsRepository.getLastRedeemedCard(user);
        let card = await this.cardsRepository.redeemRandomCard(user);

        // Reduce chance for getting same card twice in a row.
        if (lastCard && card?.id === lastCard) {
            card = await this.cardsRepository.redeemRandomCard(user);
        }

        if (card) {
            let cardToSave = card;

            // If user gets an upgrade for an existing card, user will
            // get the regular card + the upgrade.
            if (card.isUpgrade && card.baseCardName) {
                const baseCard = await this.cardsRepository.getByName(card.baseCardName);
                if (baseCard) {
                    await this.cardsRepository.saveCardUpgrade(user, baseCard, card);
                    cardToSave = baseCard;
                }
            }

            await this.cardsRepository.saveCardRedemption(user, cardToSave);
            await this.userService.changeUserPoints(user, -cost, PointLogType.RedeemCard);
            return {card, pullsLeft };
        }

        return undefined;
    }
}
