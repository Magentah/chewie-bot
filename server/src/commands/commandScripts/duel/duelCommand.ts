import { Command } from "../../command";
import { TwitchService, UserService } from "../../../services";
import { BotContainer } from "../../../inversify.config";
import { IUser } from "../../../models";
import { DuelEvent } from "../../../models/events/duelEvent";
import { EventService } from "../../../services/eventService";

/**
 * Command for starting a duel.
 * For further details see duelEvent.ts
 */
export class DuelCommand extends Command {
    constructor() {
        super();
    }

    public async execute(channel: string, user: IUser, usernameOrWager: string, wager: number): Promise<void> {
        let target;
        let wagerValue;

        if (wager === undefined) {
            wagerValue = parseInt(usernameOrWager, 10);
        } else {
            target = usernameOrWager;
            wagerValue = wager;
        }

        if (target && target.toString().toLowerCase() === user.username.toLowerCase()) {
            BotContainer.get(TwitchService).sendMessage(channel, user.username + ", you cannot duel yourself.");
            return;
        }

        if (!wagerValue || wagerValue <= 0) {
            BotContainer.get(TwitchService).sendMessage(channel, "Your wager needs to be more than that, " + user.username);
            return;
        }

        // Check if initiating user has enough points.
        if (user.points < wagerValue) {
            BotContainer.get(TwitchService).sendMessage(channel, user.username + ", you do not have enough chews to wager that much!");
            return;
        }

        // If target user is specified, get the user's details.
        let targetUser;
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

        function isEvent(event: string | DuelEvent): event is DuelEvent {
            return (event as DuelEvent).state !== undefined;
        }

        const result = BotContainer.get(EventService).startEvent(duel, user);
        if (!isEvent(result)) {
            BotContainer.get(TwitchService).sendMessage(channel, result);
        }
    }
}

export default DuelCommand;
