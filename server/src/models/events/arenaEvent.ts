import { EventService, UserService } from "../../services";
import { IUser } from "../../models";
import ParticipationEvent, { EventParticipant, EventState } from '../event';
import { BotContainer } from "../../inversify.config";
import { Logger, LogType } from '../../logger';

/**
 * Detailed description of an arena (tournament) event: http://wiki.deepbot.tv/arena
 * 1) First user starts with !startarena amount.
 * 2) Any amount of users can join with !joinarena amount (wait 2 minutes for participants to enter)
 * 3) Check the persons joining have the required amount of points
 * 4) Calculate winners (3 winners out of all users) and number of wins per user. A minimum of 4 participants is required.
 * 5) Put arena in cooldown
 */
export class ArenaEvent extends ParticipationEvent<EventParticipant> {
    public wager : number;

    constructor(initiatingUser : IUser, wager : number) {
        super(2 * 60 * 1000, 5 * 60 * 1000);

        this.wager = wager;

        this.addParticipant(new EventParticipant(initiatingUser, wager));
    }

    public start() {
        Logger.info(LogType.Command, `Arena initiated`);
        this.sendMessage(`${this.participants[0].user.username} has started a tournament! Join in! Type !joinarena [x] to enter.`);
    }
    
    public addParticipant(participant: EventParticipant) : boolean {
        if (super.addParticipant(participant)) {
            // Deduct all points used for the bet so that the points cannot be spent otherwise meanwhile.
            BotContainer.get(UserService).changeUserPoints(participant.user, -participant.points);
            return true;
        }

        return false;
    }
    
    public participationPeriodEnded(): void {
        Logger.info(LogType.Command, `Arena participation period ended`);
        this.state = EventState.BoardingCompleted;

        // Participants missing? 
        if (this.participants.length < 4) {
            this.sendMessage(`Not enough participants have entered the tournament. At least 4 are required.`);
            BotContainer.get(EventService).stopEvent(this);
        } else {
            this.startArena();
        }
    }

    public checkForOngoingEvent(runningEvent: ParticipationEvent<EventParticipant>, user : IUser): [boolean, string] {
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
        this.sendMessage("Tournament starting...");

        // Suspense
        await this.delay(10000);

        // Win or lose? We need 3 winners out of all participants.
        const fighters = this.participants.map(x => x.user);
        let winners = [];
        while (winners.length < 3)
        {
            const winIndex = Math.floor(Math.random() * Math.floor(fighters.length));
            winners.push({ 'user' : fighters[winIndex], 'points': 0 });
        }

        // Payoffs are 60% for 1st place, 25% for 2nd place, and 15% for 3rd place.
        const totalPoints = this.participants.map(x => x.points).reduce((x, y) => x + y);
        winners[0].points = Math.floor(totalPoints * 0.6);
        winners[1].points = Math.floor(totalPoints * 0.25);
        winners[2].points = Math.floor(totalPoints * 0.15);

        for (let winner of winners) {
            BotContainer.get(UserService).changeUserPoints(winner.user, winner.points);
        }
        
        this.sendMessage(`Winners: 1st place ${winners[0].user.username} won ${winners[0].points} chews, 2nd place ${winners[1].user.username} won ${winners[1].points} chews, 3rd place ${winners[2].user.username} won ${winners[2].points} chews`);

        BotContainer.get(EventService).stopEventStartCooldown(this);
    }

    public onCooldownComplete(): void {
        Logger.info(LogType.Command, `Arena cooldown ended`);
        this.sendMessage("Looks like you can start a tournament again... If you dare ( ͡° ͜ʖ ͡°)");
    }    
}

export default ArenaEvent;
