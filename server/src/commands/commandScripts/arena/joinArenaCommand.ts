import { Command } from "../../command";
import { TwitchService } from "../../../services";
import { IUser } from "../../../models";
import { EventService } from "../../../services/eventService";
import { EventState } from "../../../models/participationEvent";
import { EventParticipant } from "../../../models/eventParticipant";
import ArenaEvent from "../../../events/arenaEvent";
import EventHelper from "../../../helpers/eventHelper";
import { BotContainer } from "../../../inversify.config";

/**
 * Command for joining an arena event.
 * For further details see arenaEvent.ts
 */
export default class JoinArenaCommand extends Command {
    private twitchService: TwitchService;
    private eventService: EventService;
    constructor() {
        super();
        this.twitchService = BotContainer.get(TwitchService);
        this.eventService = BotContainer.get(EventService);
    }

    public async execute(channel: string, user: IUser): Promise<void> {
        // Arena in progress? Join existing event.
        for (const arenaInProgress of this.eventService.getEvents<ArenaEvent>()) {
            if (arenaInProgress.state === EventState.Open) {
                // Check if user has enough points (needs to be same amount for all users).
                const result = EventHelper.validatePoints(user, arenaInProgress.wager);
                if (!result[0]) {
                    this.twitchService.sendMessage(channel, result[1]);
                    return;
                }

                if (!arenaInProgress.addParticipant(new EventParticipant(user, arenaInProgress.wager), true)) {
                    this.twitchService.sendMessage(channel, user.username + ", you already joined the arena!");
                }
                return;
            } else if (arenaInProgress.state === EventState.BoardingCompleted) {
                this.twitchService.sendMessage(
                    channel,
                    user.username + ", the tournament has already started. Join next time!"
                );
                return;
            }
        }

        this.twitchService.sendMessage(
            channel,
            "No tournament is currently in progress. Use !startarena to start one."
        );
    }
}
