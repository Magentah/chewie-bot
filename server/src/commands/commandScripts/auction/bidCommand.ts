import { Command } from "../../command";
import { TwitchService } from "../../../services";
import { BotContainer } from "../../../inversify.config";
import { IUser } from "../../../models";
import { EventService } from "../../../services/eventService";
import { ParticipationEvent, EventState } from "../../../models/event";
import { EventParticipant } from "../../../models/eventParticipant";
import { AuctionEvent } from "../../../events/auctionEvent";
import { Lang } from "../../../lang";

/**
 * Command for joining an auction event.
 * For further details see auctionEvent.ts
 */
export class BidCommand extends Command {
    constructor() {
        super();
    }

    public async execute(channel: string, user: IUser, bid: number): Promise<void> {
        // Auction in progress? Join existing event.
        for (const auctionInProgress of BotContainer.get(EventService).getEvents<AuctionEvent>()) {
            if (auctionInProgress.state === EventState.Open) {
                // Check if user has enough points to bid
                if (!ParticipationEvent.validatePoints(user, channel, bid)) {
                    return;
                }

                if (!auctionInProgress.addParticipant(new EventParticipant(user, bid), true)) {
                    BotContainer.get(TwitchService).sendMessage(channel, Lang.get("auction.bidtoolow", user.username, auctionInProgress.getHighestBidAmount()));
                }
                return;
            } else if (auctionInProgress.state === EventState.BoardingCompleted) {
                BotContainer.get(TwitchService).sendMessage(channel, Lang.get("auction.isclosed", user.username));
                return;
            }
        }

        BotContainer.get(TwitchService).sendMessage(channel, Lang.get("auction.notinprogress"));
    }
}

export default BidCommand;
