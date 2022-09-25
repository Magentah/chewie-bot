import { Command } from "../../command";
import { TwitchService, EventService, UserService } from "../../../services";
import { IUser } from "../../../models";
import { EventState } from "../../../models/participationEvent";
import { EventParticipant } from "../../../models/eventParticipant";
import AuctionEvent from "../../../events/auctionEvent";
import EventHelper from "../../../helpers/eventHelper";
import { BotContainer } from "../../../inversify.config";
import { Lang } from "../../../lang";

/**
 * Command for joining an auction event.
 * For further details see auctionEvent.ts
 */
export default class BidCommand extends Command {
    private eventService: EventService;

    constructor() {
        super();

        this.eventService = BotContainer.get(EventService);
    }

    public async executeInternal(channel: string, user: IUser, bid: number): Promise<void> {
        // Auction in progress? Join existing event.
        for (const auctionInProgress of this.eventService.getEvents(AuctionEvent)) {
            if (auctionInProgress.state === EventState.Open) {
                // Check if user has enough points to bid
                const result = EventHelper.validatePoints(user, bid);
                if (!result[0]) {
                    this.twitchService.sendMessage(channel, result[1]);
                    return;
                }

                if (!await auctionInProgress.addParticipant(new EventParticipant(user, bid), true)) {
                    this.twitchService.sendMessage(
                        channel,
                        Lang.get("auction.bidtoolow", user.username, auctionInProgress.getHighestBidAmount())
                    );
                }
                return;
            } else if (auctionInProgress.state === EventState.BoardingCompleted) {
                this.twitchService.sendMessage(channel, Lang.get("auction.isclosed", user.username));
                return;
            }
        }
        this.twitchService.sendMessage(channel, Lang.get("auction.notinprogress"));
    }

    public async getDescription(): Promise<string> {
        return `Place bid in the current auction. Usage: !bid <amount>`;
    }
}
