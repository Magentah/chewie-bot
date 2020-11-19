import { Command } from "../../command";
import { TwitchService, UserService } from "../../../services";
import { BotContainer } from "../../../inversify.config";
import { IUser } from "../../../models";
import { IEvent } from "../../../models";
import { DuelEvent, DuelEventParticipant, Weapon } from "../../../models/events/duelEvent";
import { EventService } from '../../../services/eventService';

/**
 * Command for starting a duel.
 * For further details see duelEvent.ts
 */
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
            if (!targetUser) {
                BotContainer.get(TwitchService).sendMessage(channel, `Who is ${target}?`);
                return;
            }
        }

        const duel = new DuelEvent(user, targetUser, wagerValue);
        duel.sendMessage = (msg) => BotContainer.get(TwitchService).sendMessage(channel, msg);
        
        // If target user known, check if he can accept at all (check number of chews)
        if (targetUser) {
            const [validateResult, msg] = duel.canAccept(targetUser);
            if (!validateResult) {
                BotContainer.get(TwitchService).sendMessage(channel, msg);
                return;
            }
        }

        function isEvent(event: string | IEvent): event is IEvent {
            return (event as IEvent).state !== undefined;
        };

        const result = BotContainer.get(EventService).startEvent(duel, user);
        if (!isEvent(result)) {
            BotContainer.get(TwitchService).sendMessage(channel, result);
        }
    }
}

export default DuelCommand;