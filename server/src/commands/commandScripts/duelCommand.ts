import { Command } from "../command";
import { TwitchService, UserService } from "../../services";
import { BotContainer } from "../../inversify.config";
import { IUser } from "../../models";
import { IEvent } from "../../models";
import { DuelEvent, DuelEventParticipant, Weapon } from "../../models/events/duelEvent";
import { EventService } from '../../services/eventService';

export class DuelCommand extends Command {
    constructor() {
        super();
    }

    public async execute(channel: string, user: IUser, arg1 : string, arg2 : number): Promise<void> {
        let target;
        let wagerValue;

        if (arg2 == undefined) {
            wagerValue = parseInt(arg1);
        } else {
            target = arg1;
            wagerValue = arg2;
        }

        if (target && target.toString().toLowerCase() === user.username.toLowerCase())
        {
            BotContainer.get(TwitchService).sendMessage(channel, "@" + user.username + ", you cannot duel yourself.");
            return;
        }

        if (!wagerValue || wagerValue < 0)
        {
            BotContainer.get(TwitchService).sendMessage(channel, "Your wager needs to be more than that, @" + user.username);
            return;
        }

        // Check if initiating user has enough points.
        if (user.points < wagerValue)
        {
            BotContainer.get(TwitchService).sendMessage(channel, "@" + user.username + ", you do not have enough chews to wager that much!");
            return;
        }

        // If target user is specified, get the user's details.
        let targetUser = null;
        if (target) {
            targetUser = await BotContainer.get(UserService).getUser(target);
        }

        const duel = new DuelEvent(user, targetUser, wagerValue);
        
        // If target user known, check if he can accept at all (check number of chews)
        if (targetUser) {
            const [validateResult, msg] = duel.canAccept(targetUser);
            if (!validateResult) {
                BotContainer.get(TwitchService).sendMessage(channel, msg);
                return;
            }
        }

        function isEvent(event: string | IEvent): event is IEvent {
            return (event as IEvent).name !== undefined;
        };

        const result = BotContainer.get(EventService).startEvent(duel);
        if (!isEvent(result))
        {
            BotContainer.get(TwitchService).sendMessage(channel, result);
        }
    }
}

export class AcceptCommand extends Command {
    public async execute(channel: string, user: IUser, target : string, wager : string): Promise<void> {
        // Find duel that is aimed at the current user.
        const runningDuels = BotContainer.get(EventService).getEvents<DuelEvent>();
        for (let duel of runningDuels) {
            if (duel.isOpen && duel.participants.length > 1 && duel.participants[1].user == user) {
                duel.accept(user);
                return;
            }
        }

        // Find any open duel otherwise.
        for (let duel of runningDuels) {
            if (duel.isOpen && duel.participants.length == 1) {
                duel.accept(user);
                return;
            }
        }
    }
}

class WeaponCommand extends Command {
    protected chooseWeapon(channel: string, user: IUser, weapon : Weapon): void {
        // We only accept whispers for the choice of weapon.
        if (channel) {
            return;
        }

        // Find the duel which the current user is participating in.
        const runningDuels = BotContainer.get(EventService).getEvents<DuelEvent>();
        for (let duel of runningDuels) {
            if (!duel.isOpen) {
                const participant = duel.getParticipant(user) as DuelEventParticipant;
                if (participant) {
                    participant.weapon = weapon;
                    BotContainer.get(TwitchService).sendWhisper(user.username, "Your current weapon is: " + weapon);
                    return;
                }
            }
        }
    }
}

export class RockCommand extends WeaponCommand {
    public async execute(channel: string, user: IUser): Promise<void> {
        this.chooseWeapon(channel, user, Weapon.Rock);
    }
}

export class PaperCommand extends WeaponCommand {
    public async execute(channel: string, user: IUser): Promise<void> {
        this.chooseWeapon(channel, user, Weapon.Paper);
    }
}

export class ScissorsCommand extends WeaponCommand {
    public async execute(channel: string, user: IUser): Promise<void> {
        this.chooseWeapon(channel, user, Weapon.Scissors);
    }
}


export default DuelCommand;
export {AcceptCommand as acceptCommand};
export {RockCommand as rockCommand};
export {PaperCommand as paperCommand};
export {ScissorsCommand as scissorsCommand};