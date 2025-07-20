import { Command } from "../../command";
import { AchievementType, EventLogType, GameEventType, GameMessageType, IUser, UserLevels } from "../../../models";
import { BotContainer } from "../../../inversify.config";
import { UserTaxHistoryRepository, MessagesRepository } from "../../../database";
import { EventLogService, UserService } from "../../../services";
import { BotSettings } from "../../../services/botSettingsService";
import Logger, { LogType } from "../../../logger";
import { delay } from "../../../helpers/asyncHelper";
import EventAggregator from "../../../services/eventAggregator";

export default class TaxInvestigatorCommand extends Command {
    private taxRepository: UserTaxHistoryRepository;
    private userService: UserService;
    private messages: MessagesRepository;
    private eventLog: EventLogService;
    private eventAggregator: EventAggregator;

    constructor() {
        super();
        this.taxRepository = BotContainer.get(UserTaxHistoryRepository);
        this.userService = BotContainer.get(UserService);
        this.messages = BotContainer.get(MessagesRepository);
        this.eventLog = BotContainer.get(EventLogService);
        this.eventAggregator = BotContainer.get(EventAggregator);
        this.minimumUserLevel = UserLevels.Moderator;
    }

    public async executeInternal(channel: string, user: IUser): Promise<void> {
        // Determine date to check against
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(oneMonthAgo.getDate() - 31);

        // Try finding a tax evader that has not recently been timed out first.
        const penaltyCooldownInHours = await this.settingsService.getIntValue(BotSettings.TaxEvasionCooldown) / 60;
        const penaltyCoolDownDate = new Date();
        penaltyCoolDownDate.setHours(penaltyCoolDownDate.getHours() - penaltyCooldownInHours);
        let userFilter = (await this.eventLog.getTaxPenaltiesSince(penaltyCoolDownDate)).map(x => x.toLowerCase());

        if (await this.findTaxEvaders(channel, oneMonthAgo, user, userFilter)) {
            return;
        }

        // Next at least avoid those that are currently timed out because of tax evasion.
        const dateMinusTimeout = new Date();
        const penaltyDuration = await this.settingsService.getIntValue(BotSettings.TaxTimeoutDuration);
        dateMinusTimeout.setSeconds(dateMinusTimeout.getSeconds() - penaltyDuration);
        userFilter = (await this.eventLog.getTaxPenaltiesSince(dateMinusTimeout)).map(x => x.toLowerCase());
        if (await this.findTaxEvaders(channel, oneMonthAgo, user, userFilter)) {
            return;
        }

        await this.twitchService.sendMessage(channel, "No tax evaders found, everyone is safe...for now.");
    }

    private async findTaxEvaders(channel: string, oneMonthAgo: Date, inspector: IUser, userFilter: string[]) {
        // Add extra users exempt from tax
        const exemptUsers = await this.settingsService.getValue(BotSettings.TaxInspectorExemptUsers);
        if (exemptUsers) {
            for (const exemptUser of exemptUsers.split(",")) {
                userFilter.push(exemptUser.trim().toLowerCase());
            }
        }

        // Start with people currently active in chat
        const activeChatters = this.twitchService.getActiveChatters().filter((el)  => !userFilter.includes(el.toLowerCase()));
        let taxEvader = await this.findTaxEvader(activeChatters, oneMonthAgo);

        if (taxEvader) {
            await this.executePenalty(channel, taxEvader, inspector);
            return true;
        }

        try {
            const chatters = (await this.twitchWebService.getChatters()).filter((el)  => !userFilter.includes(el.user_login.toLowerCase()));
            taxEvader = await this.findTaxEvader(chatters.map(x => x.user_name), oneMonthAgo);
            if (taxEvader) {
                await this.executePenalty(channel, taxEvader, inspector);
                return true;
            }
        } catch (error : any) {
            Logger.err(LogType.Command, error);
        }

        return false;
    }

    private async executePenalty(channel: string, taxEvader: string, inspector: IUser) {
        // User names come from Twitch API so we can safely add it if user does not exist yet and log
        const user = await this.userService.addUser(taxEvader);

        // Increase penalty each time if desired
        const evasionCount = await this.eventLog.getCount(EventLogType.TaxEvasion, user);
        const penalty = await this.settingsService.getTaxEvasionPenalty(evasionCount);

        let message = `${taxEvader} has not paid their taxes and is now given a penalty.`;

        const messages = (await this.messages.getByType(GameEventType.Tax, GameMessageType.TaxInvestigation)).map(item => item.text);
        if (messages.length > 0) {
            const msgIndex = Math.floor(Math.random() * Math.floor(messages.length));
            message = messages[msgIndex].replace(/\{user\}/ig, taxEvader);
            message = message.replace(/\{duration\}/ig, (penalty / 60).toString());
        }

        await this.twitchService.sendMessage(channel, message);

        // Give users time to process the message and realize their fate.
        await delay(10000);

        await this.twitchWebService.banUser(taxEvader, penalty, "Tax evasion", true);

        await this.eventLog.addTaxEvasion(user, penalty, inspector);

        const count = await this.eventLog.getCount(EventLogType.TaxEvasion, user);
        this.eventAggregator.publishAchievement({ user, type: AchievementType.TaxEvasion, count });
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
