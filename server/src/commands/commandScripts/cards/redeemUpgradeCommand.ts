import { Command } from "../../command";
import { CardsRepository } from "./../../../database";
import { BotSettingsService } from "./../../../services";
import { IUser } from "../../../models";
import { BotContainer } from "../../../inversify.config";
import { BotSettings } from "../../../services/botSettingsService";
import { Lang } from "../../../lang";

/**
 * Trade in a certain amount for cards for an upgraded card.
 */
export default class RedeemUpgradeCommand extends Command {
    private cardsRepository: CardsRepository;
    private settingsService: BotSettingsService;

    constructor() {
        super();

        this.cardsRepository = BotContainer.get(CardsRepository);
        this.settingsService = BotContainer.get(BotSettingsService);
    }

    public async executeInternal(channel: string, user: IUser, cardName: string): Promise<void> {
        if (!cardName) {
            this.twitchService.sendMessage(channel, Lang.get("cards.redeemupgrade.missingargument", user.username));
            return;
        }

        const card = await this.cardsRepository.getByName(cardName);
        if (!card) {
            this.twitchService.sendMessage(channel, Lang.get("cards.redeemupgrade.notenoughcards", user.username));
            return;
        }

        const cardsNeeded = parseInt(await this.settingsService.getValue(BotSettings.CardsRequiredForUpgrade), 10);

        const cardCount = await this.cardsRepository.getCountByCard(user, card);
        if (cardCount < cardsNeeded) {
            this.twitchService.sendMessage(channel, Lang.get("cards.redeemupgrade.notenoughcards", user.username));
            return;
        }

        const upgradeCard = await this.cardsRepository.getUpgradeCard(card);
        if (!upgradeCard) {
            this.twitchService.sendMessage(channel, Lang.get("cards.redeemupgrade.noupgrade", user.username));
            return;
        }

        if (await this.cardsRepository.hasUpgrade(user, upgradeCard)) {
            this.twitchService.sendMessage(channel, Lang.get("cards.redeemupgrade.alreadyupgraded", user.username));
            return;
        }

        // Take all but one (or rather one less than the required amount) cards from the stack.
        // If user has exactly the amount required and redeems them all, we obviously want to leave one card to look at.
        if (await this.cardsRepository.takeCardsFromStack(user, card, cardsNeeded - 1) > 0) {
            await this.cardsRepository.saveCardUpgrade(user, card, upgradeCard);
            await this.twitchService.sendMessage(channel, Lang.get("cards.redeemupgrade.upgraded", user.username, cardName, cardsNeeded));
        }
    }

    public getDescription(): string {
        return `If available, exchanges a certain number of a cards with an upgrade of that card. Usage: !redeemupgrade <card name>`;
    }
}
