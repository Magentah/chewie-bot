import { Command } from "../../command";
import { TwitchService, EventService, UserService } from "../../../services";
import { IUser } from "../../../models";
import { EventState } from "../../../models/participationEvent";
import { EventParticipant } from "../../../models/eventParticipant";
import AuctionEvent from "../../../events/auctionEvent";
import EventHelper from "../../../helpers/eventHelper";
import { BotContainer } from "../../../inversify.config";

/**
 * Command for joining an auction event.
 * For further details see auctionEvent.ts
 */
export default class BidCommand extends Command {
    private twitchService: TwitchService;
    private eventService: EventService;

    constructor() {
        super();

        this.twitchService = BotContainer.get(TwitchService);
        this.eventService = BotContainer.get(EventService);
    }

    public async execute(channel: string, user: IUser, bid: number): Promise<void> {
        // Auction in progress? Join existing event.
        for (const auctionInProgress of this.eventService.getEvents<AuctionEvent>()) {
            if (auctionInProgress.state === EventState.Open) {
                // Check if user has enough points to bid
                const result = EventHelper.validatePoints(user, bid);
                if (!result[0]) {
                    this.twitchService.sendMessage(channel, result[1]);
                    return;
                }

                if (!auctionInProgress.addParticipant(new EventParticipant(user, bid), true)) {
                    this.twitchService.sendMessage(
                        channel,
                        `${user.username}, your bid needs to be higher than ${auctionInProgress.getHighestBidAmount()}!`
                    );
                }
                return;
            } else if (auctionInProgress.state === EventState.BoardingCompleted) {
                this.twitchService.sendMessage(channel, user.username + ", the auction is closed!");
                return;
            }
        }

        this.twitchService.sendMessage(channel, "No auction is currently in progress.");
    }
}
