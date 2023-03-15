import { Command } from "../../command";
import { GameEventType, GameMessageType, IUser, UserLevels } from "../../../models";
import { BotContainer } from "../../../inversify.config";
import { UserTaxHistoryRepository, MessagesRepository } from "../../../database";
import { EventLogService, UserService } from "../../../services";
import { BotSettings } from "../../../services/botSettingsService";
import Logger, { LogType } from "../../../logger";

export default class TaxInvestigatorCommand extends Command {
    private taxRepository: UserTaxHistoryRepository;
    private userService: UserService;
    private messages: MessagesRepository;
    private eventLog: EventLogService;

    constructor() {
        super();
        this.taxRepository = BotContainer.get(UserTaxHistoryRepository);
        this.userService = BotContainer.get(UserService);
        this.messages = BotContainer.get(MessagesRepository);
        this.eventLog = BotContainer.get(EventLogService);
        this.minimumUserLevel = UserLevels.Moderator;
    }

    public async executeInternal(channel: string, user: IUser): Promise<void> {
        // Determine date to check against
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(oneMonthAgo.getDate() - 31);

        // Start with people currently active in chat
        const activeChatters = this.twitchService.getActiveChatters();
        let taxEvader = await this.findTaxEvader(activeChatters, oneMonthAgo);
        if (taxEvader) {
            await this.executePenalty(channel, taxEvader);
            return;
        }

        try {
            const chatters = await this.twitchWebService.getChatters();
            taxEvader = await this.findTaxEvader(chatters.map(x => x.user_name), oneMonthAgo);
            if (taxEvader) {
                await this.executePenalty(channel, taxEvader);
                return;
            }
        } catch (error : any) {
            Logger.err(LogType.Command, error);
        }

        await this.twitchService.sendMessage(channel, "No tax evaders found, everyone is safe...for now.");
    }

    private async executePenalty(channel: string, taxEvader: string) {
        const penalty = await this.settingsService.getIntValue(BotSettings.TaxTimeoutDuration);

        let message = `${taxEvader} has not paid their taxes and is now given a penalty.`;

        const messages = (await this.messages.getByType(GameEventType.Tax, GameMessageType.TaxInvestigation)).map(item => item.text);
        if (messages.length > 0) {
            const msgIndex = Math.floor(Math.random() * Math.floor(messages.length));
            message = messages[msgIndex].replace(/\{user\}/ig, taxEvader);
        }

        await this.twitchService.sendMessage(channel, message);
        await this.twitchWebService.banUser(taxEvader, penalty, "Tax evasion", true);

        // User names come from Twitch API so we can safely add it if user does not exist yet and log
        const user = await this.userService.addUser(taxEvader);
        await this.eventLog.addTaxEvasion(user);
    }

    private async findTaxEvader(users: string[], oneMonthAgo: Date): Promise<string|undefined> {
        this.shuffle(users);

        for (const chatter of users) {
            // Bot does not have to pay taxes
            if (chatter.toLowerCase() === (await this.settingsService.getValue(BotSettings.BotUsername)).toLowerCase()) {
                continue;
            }

            const chatterUser = await this.userService.getUser(chatter);

            // Broadcaster cannot be punished.
            if (chatterUser?.userLevel === UserLevels.Broadcaster) {
                continue;
            }

            let hasPayedTaxes = false;
            if (chatterUser?.id) {
                const lastPayment = await this.taxRepository.getLastTaxPayment(chatterUser.id);
                if (lastPayment) {
                    hasPayedTaxes = new Date(lastPayment.taxRedemptionDate) >= oneMonthAgo;
                }
            }

            if (!hasPayedTaxes) {
                // Penalty only for subs
                if (await this.twitchWebService.isUserSubbed(chatter)) {
                    return chatter;
                }
            }
        }

        return undefined;
    }

    private shuffle(array: any[]): any[] {
        let currentIndex = array.length;
        let randomIndex;

        // While there remain elements to shuffle.
        while (currentIndex !== 0) {

            // Pick a remaining element.
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;

            // And swap it with the current element.
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]
            ];
        }

        return array;
    }

    public async getDescription(): Promise<string> {
        return "Finds tax evaders and applies adequate punishment.";
    }
}
