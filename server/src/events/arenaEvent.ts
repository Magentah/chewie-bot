import { EventService, UserService } from "../services";
import { IUser } from "../models";
import { ParticipationEvent, EventState } from "../models/event";
import { EventParticipant } from "../models/eventParticipant";
import { BotContainer } from "../inversify.config";
import { Logger, LogType } from "../logger";
import { Lang } from "../lang";

/**
 * Detailed description of an arena (tournament) event: http://wiki.deepbot.tv/arena
 * 1) First user starts with !startarena amount (only allowed for mods).
 * 2) Any amount of users can join with !joinarena amount (wait 2 minutes for participants to enter)
 * 3) Check the persons joining have the required amount of points
 * 4) Calculate winners (3 winners out of all users) and number of wins per user. A minimum of 4 participants is required.
 * 5) Put arena in cooldown
 */

const ArenaParticipationPeriod = 2 * 60 * 1000;
const ArenaCooldownPeriod = 5 * 60 * 1000;

export class ArenaEvent extends ParticipationEvent<EventParticipant> {
    private initiatingUser: IUser;
    public wager: number;

    constructor(initiatingUser: IUser, wager: number) {
        super(ArenaParticipationPeriod, ArenaCooldownPeriod);

        this.wager = wager;
        this.initiatingUser = initiatingUser;
    }

    public start() {
        Logger.info(LogType.Command, `Arena initiated`);
        this.sendMessage(Lang.get("arena.start", this.initiatingUser.username, this.wager));
    }

    public participationPeriodEnded(): void {
        Logger.info(LogType.Command, `Arena participation period ended`);
        this.state = EventState.BoardingCompleted;

        // Participants missing?
        if (this.participants.length < 4) {
            this.sendMessage(Lang.get("arena.insufficientparticipants"));
            BotContainer.get(EventService).stopEvent(this);
        } else {
            this.startArena();
        }
    }

    public checkForOngoingEvent(runningEvent: ParticipationEvent<EventParticipant>, user: IUser): [boolean, string] {
        if (runningEvent instanceof ArenaEvent) {
            if (runningEvent.state === EventState.Ended) {
                return [false, Lang.get("arena.justfinished", user.username)];
            } else if (runningEvent.state === EventState.BoardingCompleted) {
                return [false, Lang.get("arena.toolate", user.username)];
            } else {
                return [false, Lang.get("arena.inprogress")];
            }
        }

        return [true, ""];
    }

    private async startArena() {
        Logger.info(LogType.Command, `Tournament started with ${this.participants.length} participants`);
        this.sendMessage(Lang.get("arena.started", this.participants.length));

        // Suspense
        await this.delay(10000);

        // Win or lose? We need 3 winners out of all participants.
        const fighters = this.participants.map((x) => x.user);
        const winners = [];
        while (winners.length < 3) {
            const winIndex = Math.floor(Math.random() * Math.floor(fighters.length));
            winners.push({ user : fighters[winIndex], points: 0 });
        }

        // Payoffs are 60% for 1st place, 25% for 2nd place, and 15% for 3rd place.
        const totalPoints = this.participants.map((x) => x.points).reduce((x, y) => x + y);
        winners[0].points = Math.floor(totalPoints * 0.6);
        winners[1].points = Math.floor(totalPoints * 0.25);
        winners[2].points = Math.floor(totalPoints * 0.15);

        for (const winner of winners) {
            BotContainer.get(UserService).changeUserPoints(winner.user, winner.points);
        }

        // Number of wins needed to be first place should be log2(n). This is only an approximation
        // though because an odd number of participants can join and also eg. 6 participants which cannot be properly matched.
        // In the end this is all a bit fake but it shouldn't really matter.
        const numberOfWinsNeeded = Math.floor(Math.log(this.participants.length) / Math.log(2));

        this.sendMessage(Lang.get("arena.result3rd", numberOfWinsNeeded - 1, winners[2].points, winners[2].user.username));
        this.sendMessage(Lang.get("arena.result2nd", numberOfWinsNeeded - 1, winners[1].points, winners[1].user.username));
        this.sendMessage(Lang.get("arena.result1st", numberOfWinsNeeded, winners[0].points, winners[0].user.username));

        BotContainer.get(EventService).stopEventStartCooldown(this);
    }

    public onCooldownComplete(): void {
        Logger.info(LogType.Command, `Arena cooldown ended`);
        this.sendMessage(Lang.get("arena.cooldownEnd"));
    }
}

export default ArenaEvent;
