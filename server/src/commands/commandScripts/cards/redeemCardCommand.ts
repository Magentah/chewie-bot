import { Command } from "../../command";
import { CardService } from "./../../../services";
import { IUser, IUserCard } from "../../../models";
import { BotContainer } from "../../../inversify.config";
import { Lang } from "../../../lang";

/**
 * Trade in a certain amount of chews for a random sub card.
 */
export default class RedeemCardCommand extends Command {
    private cardService: CardService;

    constructor() {
        super();

        this.cardService = BotContainer.get(CardService);
    }

    public async executeInternal(channel: string, user: IUser, numberOfPulls: number): Promise<void> {
        const cardCount = numberOfPulls && Number.isInteger(numberOfPulls) ? numberOfPulls : 1;
        let cardsRedeemed = 0;
        const cardResults = new Map<string, number>();
        let lastResult : { card: IUserCard; pullsLeft: number | undefined; } | undefined = undefined;

        while (cardsRedeemed < cardCount) {
            const result = await this.cardService.redeemRandomCard(user.username);
            if (typeof result === "string") {
                // Error situation (no points left, limit exceeded, readonly mode), all conditions for aborting the loop.
                await this.twitchService.sendMessage(channel, result);
                break;
            } else if (result) {
                cardResults.set(result.card.name, (cardResults.get(result.card.name) ?? 0) + 1);
                lastResult = result;
                cardsRedeemed++;
            }
        }

        if (cardsRedeemed === 1 && lastResult) {
            // Display single card redeemed
            if (lastResult.pullsLeft === undefined) {
                await this.twitchService.sendMessage(channel, Lang.get("cards.cardredeemed", user.username, lastResult.card.name));
            } else {
                await this.twitchService.sendMessage(channel, Lang.get("cards.cardredeemedpulls", user.username, lastResult.card.name, lastResult.pullsLeft === 0 ? "no" : lastResult.pullsLeft));
            }
        } else if (lastResult) {
            // Make list of all cards redeemed.
            let resultCards = "";
            for (let entry of cardResults.entries()) {
                resultCards += `${entry[0]} (${entry[1]}), `;
            }

            resultCards = resultCards.substring(0, resultCards.length - 2);
            
            if (lastResult.pullsLeft === undefined) {
                await this.twitchService.sendMessage(channel, Lang.get("cards.cardredeemedmultiple", user.username, resultCards));
            } else {
                await this.twitchService.sendMessage(channel, Lang.get("cards.cardredeemedmultiplepulls", user.username, resultCards, lastResult.pullsLeft === 0 ? "no" : lastResult.pullsLeft));
            }
        }
    }

    public async getDescription(): Promise<string> {
        return `Redeems a random card for a certain amount of points. Usage: !redeemCard [<number of pulls>]`;
    }
}
