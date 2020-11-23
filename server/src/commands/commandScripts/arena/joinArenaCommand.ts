import { Command } from "../../command";
import { TwitchService } from "../../../services";
import { BotContainer } from "../../../inversify.config";
import { IUser } from "../../../models";
import { EventService } from "../../../services/eventService";
import { ParticipationEvent, EventState } from "../../../models/event";
import { EventParticipant } from "../../../models/eventParticipant";
import { ArenaEvent } from "../../../events/arenaEvent";

/**
 * Command for joining an arena event.
 * For further details see arenaEvent.ts
 */
export class JoinArenaCommand extends Command {
    constructor() {
        super();
    }

    public async execute(channel: string, user: IUser): Promise<void> {
        // Arena in progress? Join existing event.
        for (const arenaInProgress of BotContainer.get(EventService).getEvents<ArenaEvent>()) {
            if (arenaInProgress.state === EventState.Open) {
                // Check if user has enough points (needs to be same amount for all users).
                if (!ParticipationEvent.validatePoints(user, channel, arenaInProgress.wager)) {
                    return;
                }

                if (!arenaInProgress.addParticipant(new EventParticipant(user, arenaInProgress.wager), true)) {
                    BotContainer.get(TwitchService).sendMessage(channel, user.username + ", you already joined the arena!");
                }
                return;
            } else if (arenaInProgress.state === EventState.BoardingCompleted) {
                BotContainer.get(TwitchService).sendMessage(channel, user.username + ", the tournament has already started. Join next time!");
                return;
            }
        }

        BotContainer.get(TwitchService).sendMessage(channel, "No tournament is currently in progress. Use !startarena to start one.");
    }
}

export default JoinArenaCommand;
