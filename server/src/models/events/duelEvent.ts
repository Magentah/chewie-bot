import { EventService, UserService } from "../../services";
import { IUser } from "../../models";
import { EventParticipant, EventState, ParticipationEvent } from '../event';
import { BotContainer } from "../../inversify.config";
import { Logger, LogType } from '../../logger';

export enum Weapon {
    None = "",
    Rock = "Rock",
    Paper = "Paper",
    Scissors = "Scissors"
}

export class DuelEventParticipant extends EventParticipant {
    constructor(user : IUser, wager : number, accepted : boolean) {
        super(user, wager);
        this.accepted = accepted;
    }

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
export class DuelEvent extends ParticipationEvent<DuelEventParticipant> {
    private wager: any;
    
    constructor(initiatingUser : IUser, targetUser : IUser | null, wager : number) {
        super(60 * 1000, 2 * 60 * 1000);

        this.participants.push(new DuelEventParticipant(initiatingUser, wager, true));

        if (targetUser) {
            this.participants.push(new DuelEventParticipant(targetUser, wager, false));
            this.state = EventState.BoardingCompleted;
        }

        this.wager = wager;
        this.sendMessage = (x) => {};
    }

    public start() {
        Logger.info(LogType.Command, `Duel initialised with ${this.participants.length} participants`);
        
        if (this.participants.length > 1) {
            this.sendMessage(`Sir ${this.participants[0].user.username} has challenged Sir ${this.participants[1].user.username} to a duel for ${this.wager} chews! Sir ${this.participants[1].user.username}, to accept this duel, type !accept`);
        } else {
            // Public announcement so that anyone can join
            this.sendMessage(`Sir ${this.participants[0].user.username} has issued an open duel with the wager of ${this.wager} chews! Is there anyone who would !accept this challenge?`);
        }
    }
    
    public participationPeriodEnded(): void {
        Logger.info(LogType.Command, `Duel participation period ended`);

        // Participants missing? 
        if (this.state === EventState.Open) {
            this.sendMessage(`Oh Sir ${this.participants[0].user.username}, it appears your challenge has not been answered. The duel has been called off.`);
            BotContainer.get(EventService).stopEvent(this);
        } else if (this.state === EventState.BoardingCompleted && !this.participants[1].accepted) {
            // Participant may have been entered by the challenger, but he might have not accepted.
            this.sendMessage(`Oh Sir ${this.participants[0].user.username}, it appears ${this.participants[1].user.username} did not answer your challenge. The duel has been called off.`);
            BotContainer.get(EventService).stopEvent(this);
        }
    }

    public checkForOngoingEvent(runningEvent: ParticipationEvent<DuelEventParticipant>, user : IUser): [boolean, string] {
        if (runningEvent instanceof DuelEvent) {
            if (runningEvent.state === EventState.Ended) {
                return [false, `A duel has just finished @${user.username}. Please wait while we clean up the battleground.`];
            } else {
                return [false, `A duel is underway @${user.username}. Please wait for the current duel to finish.`];
            }
        }

        return [true, ""];
    }

    public setWeapon(user: IUser, weapon: Weapon) : boolean {
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

    public getParticipant(user: IUser) : EventParticipant | null {
        for (let participant of this.participants) {
            if (participant.user.username.toLowerCase() === user.username.toLowerCase()) {
                return participant;
            }
        }

        return null;
    }

    public hasParticipant(user: IUser) : boolean {
        return this.getParticipant(user) != null;
    }

    public canAccept(user: IUser) : [boolean, string] {
        // Check if target user has enough points.
        if (user.points < this.wager) {
            return [false, `@${user.username} does not have enough chews!`];
        }

        return [true, ""];
    }

    public accept(user: IUser) : [boolean, string] {
        Logger.info(LogType.Command, `User ${user.username} is accepting the duel`);

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
            BotContainer.get(UserService).changeUserPoints(this.participants[0].user, -this.wager);
            BotContainer.get(UserService).changeUserPoints(this.participants[1].user, -this.wager);
            
            this.waitForWeaponChoice();
            return [true, ""];
        }
        else {
            return [result, msg];
        }
    }

    private async waitForWeaponChoice() {
        Logger.info(LogType.Command, `Waiting for weapon choice`);

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

    private returnChews() {
        Logger.info(LogType.Command, `Returning chews to duel participants`);

        BotContainer.get(UserService).changeUserPoints(this.participants[0].user, this.wager);
        BotContainer.get(UserService).changeUserPoints(this.participants[1].user, this.wager);
    }

    private startDuel() {
        Logger.info(LogType.Command, `Starting duel with weapons ${this.participants[0].weapon} and ${this.participants[1].weapon}`);

        BotContainer.get(EventService).stopEventStartCooldown(this);

        // Check for draw first
        if (this.participants[0].weapon === this.participants[1].weapon) {
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
            Logger.info(LogType.Command, `Duel ended in a draw, returning ${this.wager - chewsLost} to duel participants`);
            BotContainer.get(UserService).changeUserPoints(this.participants[0].user, (this.wager - chewsLost));
            BotContainer.get(UserService).changeUserPoints(this.participants[1].user, (this.wager - chewsLost));
        } else {
            // Determine the winner and display text based on the winner's weapon.
            let winner;
            let loser;
            if (this.participants[0].weapon === Weapon.Paper && this.participants[1].weapon === Weapon.Rock
                || this.participants[0].weapon === Weapon.Rock && this.participants[1].weapon === Weapon.Scissors
                || this.participants[0].weapon === Weapon.Scissors && this.participants[1].weapon === Weapon.Paper) {
                winner = this.participants[0];
                loser  = this.participants[1];
            } else {
                winner = this.participants[1];
                loser  = this.participants[0];
            }

            // Winner gets his chews back plus the loser's chews.
            Logger.info(LogType.Command, `Duel won by ${winner.user.username}, awarding ${this.wager} chews to winner`);
            BotContainer.get(UserService).changeUserPoints(winner.user, this.wager * 2);
            
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

    public onCooldownComplete(): void {
        Logger.info(LogType.Command, `Duel cooldown ended`);
        this.sendMessage("The duelgrounds are ready for the next battle! Settle your grievances today with !duel <target> <wager>");
    }    
}

export default DuelEvent;
