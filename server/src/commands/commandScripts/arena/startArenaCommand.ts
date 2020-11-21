import { Command } from "../../command";
import { TwitchService } from "../../../services";
import { BotContainer } from "../../../inversify.config";
import { IUser } from "../../../models";
import { EventService } from '../../../services/eventService';
import { ArenaEvent } from '../../../models/events/arenaEvent';

/**
 * Command for starting an arena.
 * For further details see arenaEvent.ts
 */
export class StartArenaCommand extends Command {
    constructor() {
        super();
    }

    public async execute(channel: string, user: IUser, wager : number): Promise<void> {
        if (!wager || wager <= 0)
        {
            BotContainer.get(TwitchService).sendMessage(channel, "Your wager needs to be more than that, " + user.username);
            return;
        }

        // Check if initiating user has enough points.
        if (user.points < wager)
        {
            BotContainer.get(TwitchService).sendMessage(channel, user.username + ", you do not have enough chews to wager that much!");
            return;
        }

        const arena = new ArenaEvent(user, wager);
        arena.sendMessage = (msg) => BotContainer.get(TwitchService).sendMessage(channel, msg);
        
        function isEvent(event: string | ArenaEvent): event is ArenaEvent {
            return (event as ArenaEvent).state !== undefined;
        };

        const result = BotContainer.get(EventService).startEvent(arena, user);
        if (!isEvent(result)) {
            BotContainer.get(TwitchService).sendMessage(channel, result);
        }
    }
}

export default StartArenaCommand;