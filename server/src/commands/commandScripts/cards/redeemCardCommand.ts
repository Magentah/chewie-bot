import { Command } from "../../command";
import { CardService } from "./../../../services";
import { IUser } from "../../../models";
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

    public async executeInternal(channel: string, user: IUser): Promise<void> {
        if (!await this.checkReadOnly(channel)) {
            return;
        }

        const result = await this.cardService.redeemRandomCard(user.username);
        if (typeof result === "string") {
            await this.twitchService.sendMessage(channel, result);
        } else if (result) {
            await this.twitchService.sendMessage(channel, Lang.get("cards.cardredeemed", user.username, result.name));
        }
    }

    public getDescription(): string {
        return `Redeems a random card for a certain amount of points.`;
    }
}
