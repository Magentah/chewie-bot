import { Command } from "../../command";
import { ICommandAlias, IUser } from "../../../models";
import { EventService } from "../../../services/";
import { Logger, LogType } from "../../../logger";
import { BotContainer } from "../../../inversify.config";
import { Lang } from "../../../lang";
import CardTradingEvent from "../../../events/cardTradingEvent";

export default class AcceptOfferCommand extends Command {
    private eventService: EventService;

    constructor() {
        super();
        this.eventService = BotContainer.get(EventService);
    }

    public async executeInternal(channel: string, user: IUser): Promise<void> {
        Logger.info(LogType.Command, `Looking for a trade for ${user.username} to accept`);

        const runningTrades = this.eventService.getEvents(CardTradingEvent);
        for (const trade of runningTrades) {
            const [result, msg] = await trade.accept(user);
            if (result) {
                return;
            } else {
                this.twitchService.sendMessage(channel, msg);
                return;
            }
        }

        this.twitchService.sendMessage(channel, Lang.get("cards.trading.norunningtrade", user.username));
    }

    public getAliases(): ICommandAlias[] {
        return [
            { alias: "accepttrade", commandName: "acceptoffer" },
        ];
    }
    
    public getDescription(): string {
        return `Complete an ongoing card trade.`;
    }
}
