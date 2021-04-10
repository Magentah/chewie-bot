import { Command } from "../../command";
import { IUser, UserLevels } from "../../../models";
import { EventService } from "../../../services/eventService";
import { UserService } from "../../../services/userService";
import AuctionEvent from "../../../events/auctionEvent";
import { EventState } from "../../../models/participationEvent";
import { BotContainer } from "../../../inversify.config";
import { Lang } from "../../../lang";

/**
 * Command for starting an auction.
 * For further details see auctionEvent.ts
 */
export default class AuctionCommand extends Command {
    private eventService: EventService;
    private userService: UserService;

    constructor() {
        super();

        this.eventService = BotContainer.get(EventService);
        this.userService = BotContainer.get(UserService);

        this.minimumUserLevel = UserLevels.Moderator;
    }

    public async executeInternal(
        channel: string,
        user: IUser,
        minAmountOrAction: string,
        item: string,
        durationInMinutes: number
    ): Promise<void> {
        if (minAmountOrAction === "close") {
            // Close existing auction
            for (const auctionInProgress of this.eventService.getEvents<AuctionEvent>()) {
                if (auctionInProgress.state === EventState.Open) {
                    auctionInProgress.endAction();
                }
            }
        } else {
            const minAmount = parseInt(minAmountOrAction, 10);
            if (isNaN(minAmount)) {
                this.twitchService.sendMessage(channel, Lang.get("auction.bidnan", user.username));
                return;
            }

            if (!item) {
                this.twitchService.sendMessage(channel, Lang.get("auction.noitem", user.username));
                return;
            }

            const auction = new AuctionEvent(
                this.twitchService,
                this.userService,
                this.eventService,
                minAmount,
                item,
                durationInMinutes
            );
            auction.sendMessage = (msg) => this.twitchService.sendMessage(channel, msg);

            function isEvent(event: string | AuctionEvent): event is AuctionEvent {
                return (event as AuctionEvent).state !== undefined;
            }

            const result = this.eventService.startEvent(auction, user);
            if (!isEvent(result)) {
                this.twitchService.sendMessage(channel, result);
            }
        }
    }
}
