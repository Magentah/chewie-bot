import { EventService, UserService, TwitchService, EventLogService } from "../services";
import { IUser } from "../models";
import ParticipationEvent, { EventState } from "../models/participationEvent";
import { EventParticipant } from "../models/eventParticipant";
import { Logger, LogType } from "../logger";
import { inject } from "inversify";
import { Lang } from "../lang";
import { PointLogType } from "../models/pointLog";
import { CardsRepository } from "../database";

const TradingParticipationPeriod = 60 * 1000;

export class CardTradingEvent extends ParticipationEvent<EventParticipant> {
    private pointsWanted: number;
    private cardWanted: string | undefined;
    private cardOffered: string;
    private targetUser: IUser | undefined;
    private cardRemovedFromStackId: number | undefined = undefined;

    constructor(
        @inject(TwitchService) twitchService: TwitchService,
        @inject(UserService) userService: UserService,
        @inject(EventService) private eventService: EventService,
        @inject(EventLogService) private eventLogService: EventLogService,
        @inject(CardsRepository) private cardsRepository: CardsRepository,
        initiatingUser: IUser,
        cardOffered: string,
        pointsWanted: number,
        cardWanted: string | undefined,
        targetUser: IUser | undefined
    ) {
        super(twitchService, userService, TradingParticipationPeriod, 0, PointLogType.Bankheist);

        this.cardOffered = cardOffered;
        this.pointsWanted = pointsWanted;
        this.cardWanted = cardWanted;
        this.targetUser = targetUser;

        this.addParticipant(new EventParticipant(initiatingUser, 0), false);
    }

    public async start() {
        Logger.info(LogType.Cards, `Card trading initiated`);

        // Check if user has the card being offered.
        // Remove card from stack during event to make sure it's not being used elsewhere.
        this.cardRemovedFromStackId = await this.cardsRepository.takeCardFromStack(this.participants[0].user, this.cardOffered);
        if (!this.cardRemovedFromStackId) {
            this.sendMessage(Lang.get("cards.trading.cardnotfound", this.participants[0].user.username, this.cardOffered));
            this.eventService.stopEvent(this);
            return;
        }

        if (this.participants.length > 1) {
            if (this.pointsWanted > 0) {
                this.sendMessage(Lang.get("cards.trading.startforpoints.touser", this.participants[0].user.username, this.cardOffered, this.pointsWanted, this.participants[1].user.username));
            } else {
                this.sendMessage(Lang.get("cards.trading.startforcard.touser", this.participants[0].user.username, this.cardOffered, this.cardWanted, this.participants[1].user.username));
            }
        } else{
            if (this.pointsWanted > 0) {
                this.sendMessage(Lang.get("cards.trading.startforpoints", this.participants[0].user.username, this.cardOffered, this.pointsWanted));
            } else {
                this.sendMessage(Lang.get("cards.trading.startforcard", this.participants[0].user.username, this.cardOffered, this.cardWanted));
            }
        }
    }

    public participationPeriodEnded(): void {
        Logger.info(LogType.Cards, `Card trading participation period ended`);
        this.state = EventState.BoardingCompleted;

        // Event will have completed if a user has accepted, otherwise we'll
        // still have only one participant now.
        if (this.participants.length === 1) {
            // No one has accepted...
            if (this.cardRemovedFromStackId) {
                this.cardsRepository.returnCardToStack(this.participants[0].user, this.cardRemovedFromStackId);
            }
            this.sendMessage(Lang.get("cards.trading.incomplete", this.participants[0].user.username));
            this.eventService.stopEvent(this);
        }
    }

    public async accept(user: IUser): Promise<[boolean, string]> {
        Logger.info(LogType.Command, `User ${user.username} is accepting the trade`);

        const [result, msg] = await this.canAccept(user);
        if (result) {
            this.addParticipant(new EventParticipant(user, 0), false);
            this.completeTrading();
            return [true, ""];
        } else {
            return [result, msg];
        }
    }

    private async canAccept(user: IUser): Promise<[boolean, string]> {
        if (this.participants.length > 1) {
            return [false, ""];
        }

        if (this.targetUser) {
            if (this.targetUser.username !== user.username) {
                return [false, Lang.get("cards.trading.wronguser", user.username)];
            }
        }

        if (this.participants[0].user.username === user.username) {
            return [false, Lang.get("cards.trading.noselftrading", user.username)];
        }

        // Check if user has the card needed.
        if (this.cardWanted !== undefined) {
            if (!await this.cardsRepository.takeCardFromStack(user, this.cardWanted)) {
                return [false, Lang.get("cards.trading.notowningcard", user.username, this.cardWanted)];
            }
        } else {
            // Check if target user has enough points.
            if (this.pointsWanted > 0 && user.points < this.pointsWanted) {
                return [false, Lang.get("cards.trading.notenoughchews", user.username)];
            }
        }

        return [true, ""];
    }

    public checkForOngoingEvent(runningEvent: ParticipationEvent<EventParticipant>, user: IUser): [boolean, string] {
        if (runningEvent instanceof CardTradingEvent) {
            switch (runningEvent.state) {
                case EventState.Ended:
                    return [false, Lang.get("cards.trading.cooldown")];
                default:
                    return [false, Lang.get("cards.trading.inprogess")];
            }
        }

        return [true, ""];
    }

    private async completeTrading() {
        if (this.cardWanted !== undefined) {
            // Exchange cards
            await this.cardsRepository.addCardToStack(this.participants[0].user, this.cardWanted);
            await this.cardsRepository.addCardToStack(this.participants[1].user, this.cardOffered);
            this.sendMessage(Lang.get("cards.trading.completedcards", this.participants[0].user.username, this.cardWanted, this.participants[1].user.username, this.cardOffered));

            this.eventLogService.addCardTrading(this.participantUsernames.join(","), {
                message: "Trade completed",
                cardOffered: this.cardOffered,
                cardWanted: this.cardWanted
            });
        } else {
            // Exchange card for chews
            await this.userService.changeUserPoints(this.participants[0].user, this.pointsWanted, PointLogType.CardTrading);
            await this.userService.changeUserPoints(this.participants[1].user, -this.pointsWanted, PointLogType.CardTrading);
            await this.cardsRepository.addCardToStack(this.participants[1].user, this.cardOffered);
            this.sendMessage(Lang.get("cards.trading.completedpoints", this.participants[0].user.username, this.pointsWanted, this.participants[1].user.username, this.cardOffered));

            this.eventLogService.addCardTrading(this.participantUsernames.join(","), {
                message: "Trade completed",
                cardOffered: this.cardOffered,
                pointsWanted: this.pointsWanted
            });
        }

        this.eventService.stopEvent(this);
    }

    public onCooldownComplete(): void {
        // No cooldown and no message (for now)
    }
}

export default CardTradingEvent;
