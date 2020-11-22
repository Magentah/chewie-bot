import { EventService, UserService } from "../services";
import { IUser } from "../models";
import { ParticipationEvent, EventState } from "../models/event";
import { EventParticipant } from "../models/eventParticipant";
import { BotContainer } from "../inversify.config";
import { Logger, LogType } from "../logger";

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
        this.sendMessage(`Duke ${this.initiatingUser.username} is announcing a grand Tournament Arena. The weak shall fall and only the strongest shall walk away with riches and glory. Entry cost is set at ${this.wager}. Are you strong enough? Type !joinarena to enter.`);
    }

    public participationPeriodEnded(): void {
        Logger.info(LogType.Command, `Arena participation period ended`);
        this.state = EventState.BoardingCompleted;

        // Participants missing?
        if (this.participants.length < 4) {
            this.sendMessage(`Not enough participants have entered the tournament, at least 4 are required. The grand tournament has been called off.`);
            BotContainer.get(EventService).stopEvent(this);
        } else {
            this.startArena();
        }
    }

    public checkForOngoingEvent(runningEvent: ParticipationEvent<EventParticipant>, user: IUser): [boolean, string] {
        if (runningEvent instanceof ArenaEvent) {
            if (runningEvent.state === EventState.Ended) {
                return [false, `A tournament has just finished ${user.username}. Please wait while we clean up the battleground.`];
            } else if (runningEvent.state === EventState.BoardingCompleted) {
                return [false, `Sorry ${user.username}, you are too late. The tournament is already in progress.`];
            } else {
                return [false, `A tournament is currently in progress, use !joinarena <wager> to join!`];
            }
        }

        return [true, ""];
    }

    private async startArena() {
        Logger.info(LogType.Command, `Tournament started with ${this.participants.length} participants`);
        this.sendMessage(`${this.participants.length} fighters have entered the grand tournament. The weak shall wither, the strong shall prevail, only the best will walk away with riches and glory. Let the battles begin!`);

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

        this.sendMessage(`What a jaw dropping show of valor! In 3rd place with ${numberOfWinsNeeded - 1} victories and ${winners[2].points} Chews in winnings is ${winners[2].user.username}.`);
        this.sendMessage(`Coming in 2nd place with ${numberOfWinsNeeded - 1} victories taking away ${winners[1].points} Chews is ${winners[1].user.username}.`);
        this.sendMessage(`And.....the glorious Champion of the Arena, with ${numberOfWinsNeeded} straight wins, taking out the top prize of ${winners[0].points} Chews is ${winners[0].user.username}.`);

        BotContainer.get(EventService).stopEventStartCooldown(this);
    }

    public onCooldownComplete(): void {
        Logger.info(LogType.Command, `Arena cooldown ended`);
        this.sendMessage("The colosseum has been cleansed and preparations for the next arena are complete. Say the word my Lords, and the battle shall begin!");
    }
}

export default ArenaEvent;
