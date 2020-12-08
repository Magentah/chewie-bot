import { Command } from "../../command";
import { TwitchService } from "../../../services";
import { IUser, UserLevels } from "../../../models";
import { EventService } from "../../../services/eventService";
import { UserService } from "../../../services/userService";
import AuctionEvent from "../../../events/auctionEvent";
import { EventState } from "../../../models/participationEvent";
import { BotContainer } from "../../../inversify.config";
import { UserLevelsRepository } from "../../../database";

/**
 * Command for starting an auction.
 * For further details see auctionEvent.ts
 */
export default class AuctionCommand extends Command {
    private twitchService: TwitchService;
    private eventService: EventService;
    private userService: UserService;
    private userLevels: UserLevelsRepository;

    constructor() {
        super();

        this.twitchService = BotContainer.get(TwitchService);
        this.eventService = BotContainer.get(EventService);
        this.userService = BotContainer.get(UserService);
        this.userLevels = BotContainer.get(UserLevelsRepository);

        this.minimumUserLevel = UserLevels.Moderator;
    }

    public async execute(
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
                this.twitchService.sendMessage(channel, user.username + ", minimum bid is not a number!");
                return;
            }

            if (!item) {
                this.twitchService.sendMessage(
                    channel,
                    user.username + ", item to be auctioned needs to be specified!"
                );
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
