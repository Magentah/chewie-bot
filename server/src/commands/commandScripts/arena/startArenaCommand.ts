import { Command } from "../../command";
import { TwitchService } from "../../../services";
import { BotContainer } from "../../../inversify.config";
import { IUser, IUserLevel } from "../../../models";
import { EventService } from "../../../services/eventService";
import { ArenaEvent } from "../../../events/arenaEvent";
import { UserLevelsRepository } from "./../../../database";
import { Lang } from "../../../lang";

/**
 * Command for starting an arena.
 * For further details see arenaEvent.ts
 */
export class StartArenaCommand extends Command {
    constructor() {
        super();

        BotContainer.get(UserLevelsRepository)
                .get("Moderator")
                .then((userLevel: IUserLevel) => {
                    this.minimumUserLevel = userLevel;
        });
    }

    public async execute(channel: string, user: IUser, wager: number): Promise<void> {
        if (!wager || wager <= 0) {
            BotContainer.get(TwitchService).sendMessage(channel, Lang.get("arena.nofeespecified", user.username));
            return;
        }

        const arena = new ArenaEvent(user, wager);
        arena.sendMessage = (msg) => BotContainer.get(TwitchService).sendMessage(channel, msg);

        function isEvent(event: string | ArenaEvent): event is ArenaEvent {
            return (event as ArenaEvent).state !== undefined;
        }

        const result = BotContainer.get(EventService).startEvent(arena, user);
        if (!isEvent(result)) {
            BotContainer.get(TwitchService).sendMessage(channel, result);
        }
    }
}

export default StartArenaCommand;
