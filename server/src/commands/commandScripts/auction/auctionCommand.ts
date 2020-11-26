import { Command } from "../../command";
import { TwitchService } from "../../../services";
import { BotContainer } from "../../../inversify.config";
import { IUser, IUserLevel } from "../../../models";
import { EventService } from "../../../services/eventService";
import { AuctionEvent } from "../../../events/auctionEvent";
import { UserLevelsRepository } from "./../../../database";
import { EventState } from "../../../models/event";
import { Lang } from "../../../lang";

/**
 * Command for starting an auction.
 * For further details see auctionEvent.ts
 */
export class AuctionCommand extends Command {
    constructor() {
        super();

        BotContainer.get(UserLevelsRepository)
                .get("Moderator")
                .then((userLevel: IUserLevel) => {
                    this.minimumUserLevel = userLevel;
        });
    }

    public async execute(channel: string, user: IUser, minAmountOrAction: string, item: string, durationInMinutes: number): Promise<void> {
        if (minAmountOrAction === "close") {
            // Close existing auction
            for (const auctionInProgress of BotContainer.get(EventService).getEvents<AuctionEvent>()) {
                if (auctionInProgress.state === EventState.Open) {
                    auctionInProgress.endAction();
                }
            }
        } else {
            const minAmount = parseInt(minAmountOrAction, 10);
            if (isNaN(minAmount)) {
                BotContainer.get(TwitchService).sendMessage(channel, Lang.get("auction.bidnan", user.username));
                return;
            }

            if (!item) {
                BotContainer.get(TwitchService).sendMessage(channel, Lang.get("auction.noitem", user.username));
                return;
            }

            const auction = new AuctionEvent(minAmount, item, durationInMinutes);
            auction.sendMessage = (msg) => BotContainer.get(TwitchService).sendMessage(channel, msg);

            function isEvent(event: string | AuctionEvent): event is AuctionEvent {
                return (event as AuctionEvent).state !== undefined;
            }

            const result = BotContainer.get(EventService).startEvent(auction, user);
            if (!isEvent(result)) {
                BotContainer.get(TwitchService).sendMessage(channel, result);
            }
        }
    }
}

export default AuctionCommand;
