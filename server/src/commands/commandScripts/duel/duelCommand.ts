import { Command } from "../../command";
import { TwitchService, UserService } from "../../../services";
import { IUser } from "../../../models";
import DuelEvent from "../../../events/duelEvent";
import { EventService } from "../../../services/eventService";
import EventHelper from "../../../helpers/eventHelper";
import { BotContainer } from "../../../inversify.config";

/**
 * Command for starting a duel.
 * For further details see duelEvent.ts
 */
export default class DuelCommand extends Command {
    private twitchService: TwitchService;
    private userService: UserService;
    private eventService: EventService;

    constructor() {
        super();
        this.twitchService = BotContainer.get(TwitchService);
        this.userService = BotContainer.get(UserService);
        this.eventService = BotContainer.get(EventService);
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
            this.twitchService.sendMessage(channel, user.username + ", you cannot duel yourself.");
            return;
        }

        const result = EventHelper.validatePoints(user, wagerValue);
        if (!result[0]) {
            this.twitchService.sendMessage(channel, result[1]);
            return;
        }

        // If target user is specified, get the user's details.
        let targetUser;
        if (target) {
            targetUser = await this.userService.getUser(target);
            if (!targetUser) {
                this.twitchService.sendMessage(channel, `Who is ${target}?`);
                return;
            }
        }

        const duel = new DuelEvent(
            this.twitchService,
            this.userService,
            this.eventService,
            user,
            targetUser,
            wagerValue
        );
        duel.sendMessage = (msg) => this.twitchService.sendMessage(channel, msg);

        // If target user known, check if he can accept at all (check number of chews)
        if (targetUser) {
            const [validateResult, msg] = duel.canAccept(targetUser);
            if (!validateResult) {
                this.twitchService.sendMessage(channel, msg);
                return;
            }
        }

        function isEvent(event: string | DuelEvent): event is DuelEvent {
            return (event as DuelEvent).state !== undefined;
        }

        const eventResult = this.eventService.startEvent(duel, user);
        if (!isEvent(eventResult)) {
            this.twitchService.sendMessage(channel, eventResult);
        }
    }
}
