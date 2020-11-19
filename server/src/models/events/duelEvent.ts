import { IEvent } from "..";
import { EventService, UserService } from "../../services";
import { IUser } from "../../models";
import { IEventParticipant, EventState } from '../event';
import { BotContainer } from "../../inversify.config";

export enum Weapon {
    None = "",
    Rock = "Rock",
    Paper = "Paper",
    Scissors = "Scissors"
}

export class DuelEventParticipant implements IEventParticipant {
    constructor(user : IUser, wager : number, accepted : boolean) {
        this.user = user;
        this.points = wager;
        this.accepted = accepted;
    }

    user: IUser;
    points: number;
    weapon: Weapon = Weapon.None;
    accepted: boolean;
}

/**
 * Rough description of a duel:
 * 1) First user starts with !duel [optional] name amount.
 * 1) Check of the person initiating the duel (and the named opponent) have the required amount of points
 * 2) Wait 1 minute for the other person to accept, if no name was given, anyone can accept if they have the chews. If the duel is accepted, the points go in escrow.
 *    If not both participants have chosen a weapon, the duel is cancelled and points are returned.
 * 3) Wait 1 minutes for both participants to whisper the bot with their weapon and the bot responds confirming the selection
 * 4) Decide winner, print message, award chews. If there was a tie, both participants lose 10% of the bet that goes into a pool for later use. Go on cooldown for 2 minutes.
 */
export class DuelEvent implements IEvent {
    private wager: any;
    
    constructor(initiatingUser : IUser, targetUser : IUser | null, wager : number) {
        this.participants.push(new DuelEventParticipant(initiatingUser, wager, true));

        if (targetUser) {
            this.participants.push(new DuelEventParticipant(targetUser, wager, false));
            this.state = EventState.BoardingCompleted;
        }

        this.wager = wager;
        this.sendMessage = (x) => {};
    }

    sendMessage: (name: string) => void;

    readonly initialParticipationPeriod: number = 60 * 1000;

    readonly cooldownPeriod: number = 2 * 60 * 1000;

    participants: DuelEventParticipant[] = [];

    state: EventState = EventState.Open;

    start() {        
        if (this.participants.length > 1) {
            this.sendMessage(`Sir ${this.participants[0].user.username} has challenged Sir ${this.participants[1].user.username} to a duel for ${this.wager} chews! Sir ${this.participants[1].user.username}, to accept this duel, type !accept`);
        } else {
            // Public announcement so that anyone can join
            this.sendMessage(`Sir ${this.participants[0].user.username} has issued an open duel with the wager of ${this.wager} chews! Is there anyone who would !accept this challenge?`);
        }
    }
    
    participationPeriodEnded(): void {
        // Participants missing? 
        if (this.state == EventState.Open) {
            this.sendMessage(`Oh Sir ${this.participants[0].user.username}, it appears your challenge has not been answered. The duel has been called off.`);
            BotContainer.get(EventService).stopEvent(this);
        } else if (this.state == EventState.BoardingCompleted && !this.participants[1].accepted) {
            // Participant may have been entered by the challenger, but he might have not accepted.
            this.sendMessage(`Oh Sir ${this.participants[0].user.username}, it appears ${this.participants[1].user.username} did not answer your challenge. The duel has been called off.`);
            BotContainer.get(EventService).stopEvent(this);
        }
    }

    checkForOngoingEvent(runningEvent: IEvent, user : IUser): [boolean, string] {
        if (runningEvent instanceof DuelEvent) {
            if (runningEvent.state == EventState.Ended) {
                return [false, `A duel has just finished @${user.username}. Please wait while we clean up the battleground.`];
            } else {
                return [false, `A duel is underway @${user.username}. Please wait for the current duel to finish.`];
            }
        }

        return [true, ""];
    }

    setWeapon(user: IUser, weapon: Weapon) : boolean {
        const participant = this.getParticipant(user) as DuelEventParticipant;
        // We want to allow multiple weapon changes during the weapon selecting period.
        if (participant) {
            participant.weapon = weapon;
            return true;            
        }

        return false;
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
            this.state = EventState.BoardingCompleted;
            const participant = this.getParticipant(user) as DuelEventParticipant;
            if (!participant) { 
                this.participants.push(new DuelEventParticipant(user, this.wager, true));
            } else {
                participant.accepted = true;
            }
            
            // Deduct chews now so that they cannot be spent while choosing weapons.
            this.participants[0].user.points -= this.wager;
            this.participants[1].user.points -= this.wager;

            BotContainer.get(UserService).updateUser(this.participants[0].user);
            BotContainer.get(UserService).updateUser(this.participants[1].user);
            
            this.waitForWeaponChoice();
            return [true, ""];
        }
        else {
            return [result, msg];
        }
    }

    delay(ms: number) {
        return new Promise( resolve => setTimeout(resolve, ms) );
    }

    async waitForWeaponChoice() {
        // Wait one minute for both participants to choose a weapon.
        await this.delay(60 * 1000);

        if (this.participants[0].weapon === Weapon.None) {
            BotContainer.get(EventService).stopEvent(this);
            this.sendMessage(`How rude, Sir ${this.participants[0].user.username}, calling a duel and then not participating! The duel has been called off FeelsBadMan`);
            this.returnChews();
        } else if (this.participants[1].weapon === Weapon.None) {
            BotContainer.get(EventService).stopEvent(this);
            this.sendMessage(`Despite accepting the duel, it appears Sir ${this.participants[1].user.username} has run away! The duel has been called off FeelsBadMan`);
            this.returnChews();
        } else {            
            this.startDuel();
        }
    }

    returnChews() {
        this.participants[0].user.points += this.wager;
        this.participants[1].user.points += this.wager;

        BotContainer.get(UserService).updateUser(this.participants[0].user);
        BotContainer.get(UserService).updateUser(this.participants[1].user);
    }

    startDuel() {
        this.state = EventState.Ended;
        BotContainer.get(EventService).stopEventStartCooldown(this);

        // Check for draw first
        if (this.participants[0].weapon == this.participants[1].weapon) {
            switch (this.participants[0].weapon) {
                case Weapon.Rock:
                    this.sendMessage(`Sir ${this.participants[0].user.username} and Sir ${this.participants[1].user.username} both threw Rock! They collide with such force they fuse to form nuclear isotope cozmium-322!`);
                    break;

                case Weapon.Paper:
                    this.sendMessage(`Sir ${this.participants[0].user.username} and Sir ${this.participants[1].user.username} both threw Paper! They combine into a paper airplane and fly away!`);
                    break;

                case Weapon.Scissors:
                    this.sendMessage(`Sir ${this.participants[0].user.username} and Sir ${this.participants[1].user.username} both threw Scissors! They entangle and the audience is not quite sure if they're witnessing something indecent monkaS`);
                    break;
            }

            const chewsLost = Math.round(this.wager * 0.1);
            this.sendMessage(`Both participants lose ${chewsLost} chews chewieWUT`);

            // 10 % of chews go into a (currently non existing) pool, the remaining chews are returned.
            this.participants[0].user.points += (this.wager - chewsLost);
            this.participants[1].user.points += (this.wager - chewsLost);

            BotContainer.get(UserService).updateUser(this.participants[0].user);
            BotContainer.get(UserService).updateUser(this.participants[1].user);
        } else {
            // Determine the winner and display text based on the winner's weapon.
            let winner;
            let loser;
            if (this.participants[0].weapon == Weapon.Paper && this.participants[1].weapon == Weapon.Rock
                || this.participants[0].weapon == Weapon.Rock && this.participants[1].weapon == Weapon.Scissors
                || this.participants[0].weapon == Weapon.Scissors && this.participants[1].weapon == Weapon.Paper) {
                winner = this.participants[0];
                loser  = this.participants[1];
            } else {
                winner = this.participants[1];
                loser  = this.participants[0];
            }

            // Winner gets his chews back plus the loser's chews.
            winner.user.points += this.wager * 2;
            BotContainer.get(UserService).updateUser(winner.user);
            
            switch (winner.weapon)
            {
                case Weapon.Rock:
                    this.sendMessage(`Sir ${winner.user.username} threw Rock and absolutely smashed Sir ${loser.user.username}'s Scissors!`);
                    break;

                case Weapon.Paper:
                    this.sendMessage(`Sir ${winner.user.username}'s Paper covered Sir ${loser.user.username}'s Rock. Hello darkness my old friend FeelsBadMan`);
                    break;

                case Weapon.Scissors:
                    this.sendMessage(`Sir ${winner.user.username}'s Scissors cuts Sir ${loser.user.username}'s Paper into subatomic particles!`);
                    break;
            }

            this.sendMessage(`Sir ${winner.user.username} wins ${this.wager} chews!`);
        }
    }

    onCooldownComplete(): void {
        this.sendMessage("The duelgrounds are ready for the next battle! Settle your grievances today with !duel <target> <wager>");
    }    
}

export default DuelEvent;
