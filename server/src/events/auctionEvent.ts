import { EventService, UserService, TwitchService } from "../services";
import { IUser } from "../models";
import ParticipationEvent, { EventState } from "../models/participationEvent";
import { EventParticipant } from "../models/eventParticipant";
import { Logger, LogType } from "../logger";
import { inject } from "inversify";
import { Lang } from "../lang";
import { PointLogType } from "../models/pointLog";

/**
 * Auction:
 * 1) Mod user with !auction open <minamount> <item> [optional] <duration>
 * 2) Any amount of users can join with !bid <amount> (wait 2 minutes for participants to bid)
 * 3) Check the persons joining have the required amount of points. Add an additonal 20 seconds
 *    to the timer if a bid has been made near the end of the auction.
 * 4) Calculate winner (highest bid) and announce.
 */

const AuctionCooldownPeriod = 0;
const SnipeProtectionPeriod = 10 * 1000;
const SnipeProtectionExtensionPeriod = 20 * 1000;

export default class AuctionEvent extends ParticipationEvent<EventParticipant> {
    private item: string;
    private durationLeft: number;
    private minimumBid: number;

    constructor(
        @inject(TwitchService) twitchService: TwitchService,
        @inject(UserService) userService: UserService,
        @inject(EventService) private eventService: EventService,
        minimumBid: number,
        item: string,
        durationInMinutes: number
    ) {
        // Since we need snipe protection, don't let EventService close the event
        // based on the initial participation period.
        super(twitchService, userService, 0, AuctionCooldownPeriod, PointLogType.Auction);

        // No duration means manual closing of the auction.
        this.durationLeft = durationInMinutes ? durationInMinutes * 60 * 1000 : 0;
        this.minimumBid = minimumBid;
        this.item = item;
    }

    public start() {
        Logger.info(LogType.Command, `Auction initiated`);

        if (this.durationLeft) {
            // Auction with time limit
            this.sendMessage(
                Lang.get("auction.starttimelimit", this.item, this.minimumBid, this.durationLeft / 60 / 1000)
            );

            // Run 1s timer to check if the auction is over.
            // Duration left might be increased if a bid happens within the last 20 s.
            const intervalLength = 1000;
            const intervalId = setInterval(() => {
                this.durationLeft -= intervalLength;
                if (this.durationLeft <= 0) {
                    this.endAction();
                }

                if (this.state !== EventState.Open) {
                    clearInterval(intervalId);
                }
            }, intervalLength);
        } else {
            // Auction without time limit (needs be manually closed)
            this.sendMessage(Lang.get("auction.start", this.item, this.minimumBid));
        }

        this.runAnnouncmentTimer();
    }

    /**
     * Announce the current highest bidder while the auction is still running on a regular basis.
     */
    private async runAnnouncmentTimer() {
        while (this.state === EventState.Open) {
            await this.delay(60 * 1000);

            const highestBid = this.getHighestBid();
            if (this.state === EventState.Open && highestBid) {
                this.sendMessage(Lang.get("auction.status", this.item, highestBid.user.username, highestBid.points));
            }
        }
    }

    public participationPeriodEnded(): void {
        Logger.info(LogType.Command, `Auction time limited exceeded`);
        this.endAction();
    }

    public endAction() {
        this.state = EventState.BoardingCompleted;
        this.declareWinner();
    }

    /**
     * Registers a bid for a user. The same user may make multiple bids.
     * @param participant User and points to register
     * @param deductPoints (ignored)
     * @returns false if the bid was not high enough.
     */
    public async addParticipant(participant: EventParticipant, deductPoints: boolean): Promise<boolean> {
        // Only accept bid if > minimum bid and > current max bid.
        if (participant.points < this.minimumBid) {
            return false;
        }

        const highestBid = this.getHighestBid();
        if (highestBid && participant.points <= highestBid.points) {
            return false;
        }

        // Snipe protection: Keep auction running for a while longer if a bid comes in.
        if (this.durationLeft > 0 && this.durationLeft < SnipeProtectionPeriod) {
            Logger.info(
                LogType.Command,
                `Snipe protection activated, increasing auction duration by ${SnipeProtectionExtensionPeriod} ms`
            );
            this.durationLeft += SnipeProtectionExtensionPeriod;
        }

        this.sendMessage(Lang.get("auction.newbid", participant.points, participant.user.username));

        // Change bid of participating user.
        for (const p of this.participants) {
            if (p.user.username.toLowerCase() === participant.user.username.toLowerCase()) {
                p.points = participant.points;
                return true;
            }
        }

        this.participants.push(participant);
        return true;
    }

    public getHighestBidAmount(): number {
        const highestBidder = this.getHighestBid();
        return highestBidder ? highestBidder.points : this.minimumBid;
    }

    public getHighestBid(): EventParticipant | undefined {
        if (this.participants.length === 0) {
            return undefined;
        } else {
            let highestBidder = this.participants[0];
            for (const participant of this.participants) {
                if (participant.points > highestBidder.points) {
                    highestBidder = participant;
                }
            }

            return highestBidder;
        }
    }

    private declareWinner() {
        const highestBid = this.getHighestBid();
        if (highestBid) {
            this.userService.changeUserPoints(highestBid.user, -highestBid.points, this.pointLogType);
            this.sendMessage(Lang.get("auction.closedwin", highestBid.user.username, highestBid.points));
        } else {
            this.sendMessage(Lang.get("auction.closed"));
        }

        this.eventService.stopEventStartCooldown(this);
    }

    public checkForOngoingEvent(runningEvent: ParticipationEvent<EventParticipant>, user: IUser): [boolean, string] {
        if (runningEvent instanceof AuctionEvent) {
            if (runningEvent.state === EventState.Ended) {
                // Cooldown is currently 0, so this shouldn't really happen.
                return [false, Lang.get("auction.cooldown")];
            } else {
                return [false, Lang.get("auction.inprogress")];
            }
        }

        return [true, ""];
    }

    public onCooldownComplete(): void {
        Logger.info(LogType.Command, `Auction cooldown ended`);
    }
}
