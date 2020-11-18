import { IEvent } from "..";
import { TwitchService } from "../../services";
import { UserService } from "../../services";
import { BotContainer } from "../../inversify.config";
import { IUser } from "../../models";
import { IEventParticipant } from '../event';

/* Rough description of a duel:
1) First user starts with !duel [optional] name amount. When no user name is given, anyone can !accept the duel.
1) Check of the person initiating the duel (and the named opponent) have the required amount of points
2) Wait 1 minute for the other person to accept, if no name was given, anyone can accept if they have the chews. If the duel is accepted, the points go in escrow.
3) Wait 1 minutes for both participants to whisper the bot with their weapon and the bot responds confirming the selection
4) Decide winner, print message, award chews. If there was a tie, both participants lose 10% of the bet that goes into a pool for later use. Go on cooldown for 2 minutes
*/ 

export enum Weapon {
    None = 0,
    Rock = 1,
    Paper = 2,
    Scissors = 3
}

export class DuelEventParticipant implements IEventParticipant {
    constructor(user : IUser, wager : number) {
        this.user = user;
        this.points = wager;
    }

    user: IUser;
    points: number;
    weapon: Weapon = Weapon.None;
}

export class DuelEvent implements IEvent {
    private wager: any;
    
    constructor(initiatingUser : IUser, targetUser : IUser | null, wager : number) {
        this.participants.push(new DuelEventParticipant(initiatingUser, wager));

        if (targetUser) {
            this.participants.push(new DuelEventParticipant(targetUser, wager));
            this.isOpen = false;
        }

        this.wager = wager
    }

    participants: DuelEventParticipant[] = [];

    name: string = "Duel";
    
    isOpen: boolean = true;

    checkConflict(event: IEvent): [boolean, string] {
        if (event instanceof DuelEvent) {
            // The same user cannot be part of any other duel. Otherwise the bot 
            // wouldn't know for which duel the whispered command is.
            for (let participant of event.participants) {
                if (this.hasParticipant(participant.user)) {
                    return [false, `@${participant.user.username} is already in a duel right now.`];
                }
            }
        }

        return [true, ""];
    }

    getParticipant(user: IUser) : IEventParticipant | null {
        for (let participant of this.participants) {
            if (participant.user.username.toLowerCase() === user.username.toLowerCase()) {
                return participant;
            }
        }

        return null;
    }

    hasParticipant(user: IUser) : boolean {
        return this.getParticipant(user) != null;
    }

    canAccept(user: IUser) : [boolean, string] {
        // Check if target user has enough points.
        if (user.points < this.wager) {
            return [false, `@${user.username} does not have enough chews!`];
        }

        return [true, ""];
    }

    accept(user: IUser) : [boolean, string] {
        const [result, msg] = this.canAccept(user);
        if (result) {
            this.participants.push(new DuelEventParticipant(user, this.wager));
            this.isOpen = false;
            return [true, ""];
        }
        else {
            return [result, msg];
        }
    }
}

export default DuelEvent;
