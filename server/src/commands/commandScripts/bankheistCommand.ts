import { Command } from "../command";
import { EventAggregator, EventLogService } from "../../services";
import { IUser } from "../../models";
import { BankheistEvent } from "../../events/bankheistEvent";
import { EventService } from "../../services/eventService";
import { UserService } from "../../services/userService";
import { EventState } from "../../models/participationEvent";
import { EventParticipant } from "../../models/eventParticipant";
import EventHelper from "../../helpers/eventHelper";
import { BotContainer } from "../../inversify.config";
import MessagesRepository from "../../database/messagesRepository";
import PointLogsRepository from "../../database/pointLogsRepository";
import SeasonsRepository from "../../database/seasonsRepository";
import { Lang } from "../../lang";

/**
 * Command for starting a bankheist.
 * For further details see bankheistEvent.ts
 */
export class BankheistCommand extends Command {
    private eventService: EventService;
    private userService: UserService;
    private eventLogService: EventLogService;
    private messages: MessagesRepository;
    private eventAggregator: EventAggregator;
    private pointsLog: PointLogsRepository;
    private seasonsRepository: SeasonsRepository;

    constructor() {
        super();

        this.eventService = BotContainer.get(EventService);
        this.userService = BotContainer.get(UserService);
        this.eventLogService = BotContainer.get(EventLogService);
        this.messages = BotContainer.get(MessagesRepository);
        this.pointsLog = BotContainer.get(PointLogsRepository);
        this.eventAggregator = BotContainer.get(EventAggregator);
        this.seasonsRepository = BotContainer.get(SeasonsRepository);
    }

    public async executeInternal(channel: string, user: IUser, wager: number | string): Promise<void> {
        if (await this.isReadOnly(channel)) {
            return;
        }

        let wagerNumeric = Number(wager);
        if (wager.toString().toLowerCase() === "all") {
            wagerNumeric = user.points;
        }

        const result = EventHelper.validatePoints(user, wagerNumeric);
        if (!result[0]) {
            this.twitchService.sendMessage(channel, result[1]);
            return;
        }

        // Bankheist in progress? Join existing event.
        for (const heistInProgress of this.eventService.getEvents(BankheistEvent)) {
            if (heistInProgress.state === EventState.Open) {
                if (!await heistInProgress.addParticipant(new EventParticipant(user, wagerNumeric))) {
                    this.twitchService.sendMessage(channel, Lang.get("bankheist.alreadyjoined", user.username));
                }
                return;
            }
        }

        const bankheist = new BankheistEvent(this.twitchService, this.userService, this.eventService, this.eventLogService, this.messages,
            this.pointsLog, this.seasonsRepository, this.eventAggregator, user, wagerNumeric);
        bankheist.sendMessage = (msg) => this.twitchService.sendMessage(channel, msg);

        function isEvent(event: string | BankheistEvent): event is BankheistEvent {
            return (event as BankheistEvent).state !== undefined;
        }

        const eventResult = this.eventService.startEvent(bankheist, user);
        if (!isEvent(eventResult)) {
            this.twitchService.sendMessage(channel, eventResult);
        }
    }

    public async getDescription(): Promise<string> {
        return `Starts or joins a bankheist with a certain amount of chews as wager. Usage: !bankheist <amount>`;
    }
}

export default BankheistCommand;
