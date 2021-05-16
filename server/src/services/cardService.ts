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

    public async redeemRandomCard(username: string): Promise<IUserCard | string | undefined> {
        const user = await this.userService.getUser(username);
        if (!user) {
            return undefined;
        }

        const cost = parseInt(await this.settingsService.getValue(BotSettings.CardRedeemCost), 10);
        if (cost > user.points) {
            return Lang.get("cards.insufficientpoints", user.username);
        }

        // Check if user already has redeemed too many cards this week.
        const cardsPerWeek = parseInt(await this.settingsService.getValue(BotSettings.CardRedeemPerWeek), 10);
        if (cardsPerWeek > 0) {
            const cardsRedeemed = await this.cardsRepository.getRedeemedCardCount(user, new Date());
            if (cardsRedeemed >= cardsPerWeek) {
                return Lang.get("cards.redeemlimitexceeded", user.username, cardsRedeemed);
            }
        }

        const card = await this.cardsRepository.redeemRandomCard(user);
        if (card) {
            await this.userService.changeUserPoints(user, -cost, PointLogType.RedeemCard);
            return card;
        }

        return undefined;
    }
}
