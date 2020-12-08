import { Command } from "../../command";
import { TwitchService, UserService } from "../../../services";
import { IUser, UserLevels } from "../../../models";
import { EventService } from "../../../services/eventService";
import ArenaEvent from "../../../events/arenaEvent";
import { UserLevelsRepository } from "./../../../database";
import { BotContainer } from "../../../inversify.config";
import { Lang } from "../../../lang";

/**
 * Command for starting an arena.
 * For further details see arenaEvent.ts
 */
export default class StartArenaCommand extends Command {
    private userLevels: UserLevelsRepository;
    private twitchService: TwitchService;
    private eventService: EventService;
    private userService: UserService;

    constructor() {
        super();

        this.userLevels = BotContainer.get(UserLevelsRepository);
        this.twitchService = BotContainer.get(TwitchService);
        this.eventService = BotContainer.get(EventService);
        this.userService = BotContainer.get(UserService);

        this.minimumUserLevel = UserLevels.Moderator;
    }

    public async execute(channel: string, user: IUser, wager: number): Promise<void> {
        if (!wager || wager <= 0) {
            this.twitchService.sendMessage(channel, Lang.get("arena.nofeespecified", user.username));
            return;
        }

        const arena = new ArenaEvent(this.twitchService, this.userService, this.eventService, user, wager);
        arena.sendMessage = (msg) => this.twitchService.sendMessage(channel, msg);

        function isEvent(event: string | ArenaEvent): event is ArenaEvent {
            return (event as ArenaEvent).state !== undefined;
        }

        const result = this.eventService.startEvent(arena, user);
        if (!isEvent(result)) {
            this.twitchService.sendMessage(channel, result);
        }
    }
}
