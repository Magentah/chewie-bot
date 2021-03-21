import { EventService, UserService, TwitchService, EventLogService } from "../services";
import { IUser } from "../models";
import ParticipationEvent, { EventState } from "../models/participationEvent";
import { EventParticipant } from "../models/eventParticipant";
import { Logger, LogType } from "../logger";
import { DuelEventParticipant } from "./duelEventParticipant";
import { DuelWeapon } from "./duelWeapon";
import { inject } from "inversify";
import { Lang } from "../lang";

/**
 * Rough description of a duel:
 * 1) First user starts with !duel [optional] name amount.
 * 1) Check of the person initiating the duel (and the named opponent) have the required amount of points
 * 2) Wait 1 minute for the other person to accept, if no name was given, anyone can accept if they have the chews. If the duel is accepted, the points go in escrow.
 *    If not both participants have chosen a weapon, the duel is cancelled and points are returned.
 * 3) Wait 1 minutes for both participants to whisper the bot with their weapon and the bot responds confirming the selection
 * 4) Decide winner, print message, award chews. If there was a tie, both participants lose 10% of the bet that goes into a pool for later use. Go on cooldown for 2 minutes.
 */

const DuelParticipationPeriod = 60 * 1000;
const DuelCooldownPeriod = 2 * 60 * 1000;

export default class DuelEvent extends ParticipationEvent<DuelEventParticipant> {
    private wager: any;

    constructor(
        @inject(TwitchService) twitchService: TwitchService,
        @inject(UserService) userService: UserService,
        @inject(EventService) private eventService: EventService,
        @inject(EventLogService) private eventLogService: EventLogService,
        initiatingUser: IUser,
        targetUser: IUser | undefined,
        wager: number
    ) {
        super(twitchService, userService, DuelParticipationPeriod, DuelCooldownPeriod);

        this.participants.push(new DuelEventParticipant(initiatingUser, wager, true));
        this.participantUsernames.push(initiatingUser.username);

        if (targetUser) {
            this.participants.push(new DuelEventParticipant(targetUser, wager, false));
            this.participantUsernames.push(targetUser.username);
            this.state = EventState.BoardingCompleted;
        }

        this.wager = wager;
        this.sendMessage = (x) => undefined;
    }

    public start() {
        Logger.info(LogType.Command, `Duel initialised with ${this.participants.length} participants`);

        if (this.participants.length > 1) {
            this.sendMessage(Lang.get("duel.start", this.participants[0].user.username, this.participants[1].user.username, this.wager));
        } else {
            // Public announcement so that anyone can join
            this.sendMessage(Lang.get("duel.startopen", this.participants[0].user.username, this.wager));
        }
    }

    public participationPeriodEnded(): void {
        Logger.info(LogType.Command, `Duel participation period ended`);

        // Participants missing?
        if (this.state === EventState.Open) {
            this.sendMessage(Lang.get("duel.noparticipants", this.participants[0].user.username));
            this.eventService.stopEvent(this);
        } else if (this.state === EventState.BoardingCompleted && !this.participants[1].accepted) {
            // Participant may have been entered by the challenger, but he might have not accepted.
            this.sendMessage(Lang.get("duel.notaccepted", this.participants[0].user.username, this.participants[1].user.username));
            this.eventService.stopEvent(this);
        }
    }

    public checkForOngoingEvent(runningEvent: ParticipationEvent<DuelEventParticipant>, user: IUser): [boolean, string] {
        if (runningEvent instanceof DuelEvent) {
            if (runningEvent.state === EventState.Ended) {
                return [false, Lang.get("duel.cooldown", user.username)];
            } else {
                return [false, Lang.get("duel.inprogress", user.username)];
            }
        }

        return [true, ""];
    }

    public setWeapon(user: IUser, weapon: DuelWeapon): boolean {
        Logger.info(LogType.Command, `Attempting to set weapon for user ${user.username}`);

        const participant = this.getParticipant(user) as DuelEventParticipant;
        // We want to allow multiple weapon changes during the weapon selecting period.
        if (participant) {
            participant.weapon = weapon;
            return true;
        } else {
            Logger.warn(LogType.Command, `Could not find ${user.username} among the duel participants`);
        }

        return false;
    }

    public getParticipant(user: IUser): EventParticipant | undefined {
        for (const participant of this.participants) {
            if (participant.user.username.toLowerCase() === user.username.toLowerCase()) {
                return participant;
            }
        }

        return undefined;
    }

    public hasParticipant(user: IUser): boolean {
        return this.getParticipant(user) !== undefined;
    }

    public canAccept(user: IUser): [boolean, string] {
        // Check if target user has enough points.
        if (user.points < this.wager) {
            return [false, Lang.get("duel.notenoughchews", user.username)];
        }

        return [true, ""];
    }

    public accept(user: IUser): [boolean, string] {
        Logger.info(LogType.Command, `User ${user.username} is accepting the duel`);

        const [result, msg] = this.canAccept(user);
        if (result) {
            this.state = EventState.BoardingCompleted;
            const participant = this.getParticipant(user) as DuelEventParticipant;
            if (!participant) {
                this.participantUsernames.push(user.username);
                this.participants.push(new DuelEventParticipant(user, this.wager, true));
            } else {
                participant.accepted = true;
            }

            // Deduct chews now so that they cannot be spent while choosing weapons.
            this.userService.changeUsersPoints(
                this.participants.map((x) => x.user),
                -this.wager
            );

            this.waitForWeaponChoice();
            return [true, ""];
        } else {
            return [result, msg];
        }
    }

    private async waitForWeaponChoice() {
        Logger.info(LogType.Command, `Waiting for weapon choice`);

        // Wait one minute for both participants to choose a weapon.
        await this.delay(60 * 1000);

        if (this.participants[0].weapon === DuelWeapon.None) {
            this.eventService.stopEvent(this);
            this.sendMessage(Lang.get("duel.calledoffbyinitiator", this.participants[0].user.username));
            this.returnChews();
        } else if (this.participants[1].weapon === DuelWeapon.None) {
            this.eventService.stopEvent(this);
            this.sendMessage(Lang.get("duel.calledoffbyopponent", this.participants[1].user.username));
            this.returnChews();
        } else {
            this.startDuel();
        }
    }

    private returnChews() {
        Logger.info(LogType.Command, `Returning chews to duel participants`);

        this.userService.changeUsersPoints(
            this.participants.map((x) => x.user),
            this.wager
        );
    }

    private startDuel() {
        Logger.info(LogType.Command, `Starting duel with weapons ${this.participants[0].weapon} and ${this.participants[1].weapon}`);

        this.eventService.stopEventStartCooldown(this);

        // Check for draw first
        if (this.participants[0].weapon === this.participants[1].weapon) {
            switch (this.participants[0].weapon) {
                case DuelWeapon.Rock:
                    this.sendMessage(Lang.get("duel.drawrock", this.participants[0].user.username, this.participants[1].user.username));
                    break;

                case DuelWeapon.Paper:
                    this.sendMessage(Lang.get("duel.drawpaper", this.participants[0].user.username, this.participants[1].user.username));
                    break;

                case DuelWeapon.Scissors:
                    this.sendMessage(Lang.get("duel.drawscissors", this.participants[0].user.username, this.participants[1].user.username));
                    break;
            }

            const chewsLost = Math.round(this.wager * 0.1);
            this.sendMessage(Lang.get("duel.chewslost", chewsLost));

            // 10 % of chews go into a (currently non existing) pool, the remaining chews are returned.
            Logger.info(LogType.Command, `Duel ended in a draw, returning ${this.wager - chewsLost} to duel participants`);
            this.eventLogService.addDuel(this.participantUsernames.join(","), {
                message: "Duel concluded in a draw.",
                participants: this.participants,
                pointsWon: 0,
                pointsLost: chewsLost,
            });
            this.userService.changeUsersPoints(
                this.participants.map((x) => x.user),
                this.wager - chewsLost
            );
        } else {
            // Determine the winner and display text based on the winner's weapon.
            let winner;
            let loser;
            if (
                (this.participants[0].weapon === DuelWeapon.Paper && this.participants[1].weapon === DuelWeapon.Rock) ||
                (this.participants[0].weapon === DuelWeapon.Rock && this.participants[1].weapon === DuelWeapon.Scissors) ||
                (this.participants[0].weapon === DuelWeapon.Scissors && this.participants[1].weapon === DuelWeapon.Paper)
            ) {
                winner = this.participants[0];
                loser = this.participants[1];
            } else {
                winner = this.participants[1];
                loser = this.participants[0];
            }

            // Winner gets his chews back plus the loser's chews.
            Logger.info(LogType.Command, `Duel won by ${winner.user.username}, awarding ${this.wager} chews to winner`);
            this.eventLogService.addDuel(this.participantUsernames.join(","), {
                message: "Duel concluded in a win.",
                participants: this.participants,
                pointsWon: this.wager,
            });
            this.userService.changeUserPoints(winner.user, this.wager * 2);

            switch (winner.weapon) {
                case DuelWeapon.Rock:
                    this.sendMessage(Lang.get("duel.winrock", winner.user.username, loser.user.username));
                    break;

                case DuelWeapon.Paper:
                    this.sendMessage(Lang.get("duel.winpaper", winner.user.username, loser.user.username));
                    break;

                case DuelWeapon.Scissors:
                    this.sendMessage(Lang.get("duel.winscissors", winner.user.username, loser.user.username));
                    break;
            }

            this.sendMessage(Lang.get("duel.chewswon", winner.user.username, this.wager));
        }
    }

    public onCooldownComplete(): void {
        Logger.info(LogType.Command, `Duel cooldown ended`);
        this.sendMessage(Lang.get("duel.cooldownEnd"));
    }
}
