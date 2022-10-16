import { Command } from "../../command";
import { IUser } from "../../../models";
import { BotContainer } from "../../../inversify.config";
import { CardsRepository } from "../../../database";

export default class CardStatsCommand extends Command {
    private cards: CardsRepository;

    constructor() {
        super();
        this.cards = BotContainer.get(CardsRepository);
    }

    public async executeInternal(channel: string, user: IUser, ...args: string[]): Promise<void> {
        const searchSubject = args.join(" ");
        if (!searchSubject) {
            await this.twitchService.sendMessage(channel, `${user.username}, you did not specify a search subject.`);
            return;
        }

        const card = await this.cards.findByName(searchSubject);
        let userCount = 0;

        if (card && (userCount = await this.cards.getCountByCard(user, card)) > 0) {
            // General song info
            let info = `Card: ${card.name}`;
            if (card.setName){
                info += `, part of ${card.setName}`;
            }

            const hasUpgrade = await this.cards.hasUpgrade(user, card);
            info += `, owning ${userCount} (upgraded: ${hasUpgrade ? "yes" : "no"})`;
            info += `, redeemable: ${card.isEnabled ? "yes" : "no"}`;

            // Show date added (if available)
            if (card.creationDate) {
                const dateFormat = new Intl.DateTimeFormat("en", { day: "2-digit", year: "numeric", month: "short" });
                info += `, added ${dateFormat.format(new Date(card.creationDate))}`;
            }

            const totalCount = await this.cards.getGlobalCountByCard(card);
            info += `, cards in circulation: ${totalCount}`;

            await this.twitchService.sendMessage(channel, info);
        } else {
            await this.twitchService.sendMessage(channel, `No card found for "${searchSubject}".`);
        }
    }

    public async getDescription(): Promise<string> {
        return "Outputs additional information about a specific card. Usage: !cardStats <search subject>";
    }
}
