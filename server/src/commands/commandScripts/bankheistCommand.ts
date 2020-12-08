import { Command } from "../command";
import { TwitchService } from "../../services";
import { IUser } from "../../models";
import { BankheistEvent } from "../../events/bankheistEvent";
import { EventService } from "../../services/eventService";
import { UserService } from "../../services/userService";
import { EventState } from "../../models/participationEvent";
import { EventParticipant } from "../../models/eventParticipant";
import EventHelper from "../../helpers/eventHelper";
import { BotContainer } from "../../inversify.config";

/**
 * Command for starting a bankheist.
 * For further details see bankheistEvent.ts
 */
export class BankheistCommand extends Command {
    private twitchService: TwitchService;
    private eventService: EventService;
    private userService: UserService;

    constructor() {
        super();

        this.twitchService = BotContainer.get(TwitchService);
        this.eventService = BotContainer.get(EventService);
        this.userService = BotContainer.get(UserService);
    }

    public async execute(channel: string, user: IUser, wager: number): Promise<void> {
        const result = EventHelper.validatePoints(user, wager);
        if (!result[0]) {
            this.twitchService.sendMessage(channel, result[1]);
            return;
        }

        // Bankheist in progress? Join existing event.
        for (const heistInProgress of this.eventService.getEvents<BankheistEvent>()) {
            if (heistInProgress.state === EventState.Open) {
                if (!heistInProgress.addParticipant(new EventParticipant(user, wager))) {
                    this.twitchService.sendMessage(channel, user.username + ", you already joined the bank heist!");
                }
                return;
            }
        }

        const bankheist = new BankheistEvent(this.twitchService, this.userService, this.eventService, user, wager);
        bankheist.sendMessage = (msg) => this.twitchService.sendMessage(channel, msg);

        function isEvent(event: string | BankheistEvent): event is BankheistEvent {
            return (event as BankheistEvent).state !== undefined;
        }

        const eventResult = this.eventService.startEvent(bankheist, user);
        if (!isEvent(eventResult)) {
            this.twitchService.sendMessage(channel, eventResult);
        }
    }
}

export default BankheistCommand;
