import { Command } from "../command";
import { EventTypes, IGenerateTextData, ITextCommand, IUser, TextCommandMessagType } from "../../models";
import Logger, { LogType } from "../../logger";
import { BotContainer } from "../../inversify.config";
import { StreamActivityRepository, TextCommandsRepository } from "../../database";
import { BotSettings } from "../../services/botSettingsService";
import moment = require("moment");
import OpenAiService from "../../services/openAiService";

// I think it's better to have a "command" to handle all text commands instead of having the
// command service directly call the twitchservice.sendmessage with the text command.
// This is only supposed to be used by the bot for internal use.
export class TextCommand extends Command {
    private readonly cooldowns: { [name: string] : boolean; } = {};

    private commands: TextCommandsRepository;
    private streamActivityRepository: StreamActivityRepository;
    private openAiService: OpenAiService;

    constructor() {
        super();

        this.isInternalCommand = true;
        this.commands = BotContainer.get(TextCommandsRepository);
        this.streamActivityRepository = BotContainer.get(StreamActivityRepository);
        this.openAiService = BotContainer.get(OpenAiService);
    }

    public async executeWithOptions(commandInfo: ITextCommand, channel: string, user: IUser, args: string[]) {
        if (commandInfo.minimumUserLevel) {
            if (!user?.userLevel || user.userLevel < commandInfo.minimumUserLevel) {
                await this.twitchService.sendMessage(channel, `${user.username}, you do not have permissions to execute this command.` );
                return;
            }
        }

        // Skip command if still in cooldown.
        if (commandInfo.useCooldown) {
            if (this.cooldowns[commandInfo.commandName]) {
                return;
            } else {
                const cooldown = parseInt(await this.settingsService.getValue(BotSettings.CommandCooldownInSeconds), 10);
                this.cooldowns[commandInfo.commandName] = true;
                setTimeout(() => {
                    this.cooldowns[commandInfo.commandName] = false;
                }, cooldown * 1000);
            }
        }

        let msg = await this.getCommandText(user, commandInfo.commandName, [commandInfo.message, ...args]);

        switch (commandInfo.messageType) {
            case TextCommandMessagType.AiPrompt:
                if (!msg) {
                    return;
                }

                const data = JSON.parse(msg) as IGenerateTextData;

                // Use a previously generated value as fallback if possible
                let fallback = await this.commands.getFallbackFromCache(commandInfo.id ?? 0, data.prompt);
                if (!fallback) {
                    fallback = data.fallback;
                }

                try {
                    // Do this with timeout. If API is too slow we don't want to wait forever
                    msg = await this.fetchWithTimeout(commandInfo, data.timeout ?? 8000, data.prompt, fallback);
                } catch (error: any) {
                    // Make sure to not output the original JSON
                    msg = "";
                    Logger.err(LogType.Command, error as Error);
                }

                if (!msg) {
                    msg = fallback;
                }
                break;
        }

        await this.twitchService.sendMessage(channel, msg);
    }

    private async fetchWithTimeout(commandInfo: ITextCommand, timeout: number, prompt: string, fallback: string): Promise<string> {
        const result = await Promise.race([
            (async() => {
                const promptResult = await this.openAiService.generateText(prompt, true)
                await this.commands.addCache({ key: prompt, result: promptResult, commandId: commandInfo.id, time: new Date().getTime() });
                return promptResult;
            })(),
            new Promise(resolve => setTimeout(() => resolve(fallback), timeout))
        ]);

        return result as string;
    }

    public async getCommandText(user: IUser, commandName: string, args: any[]): Promise<string> {
        let message = args[0] as string;

        for (let i = 1; i < args.length; i++) {
            if (args[i]) {
                const regex = new RegExp(`\\{${i}\\}`, "g");
                message = message.replace(regex, args[i]);
            }
        }

        const paramCheck = /\{[0-9]\}/;
        if (paramCheck.test(message)) {
            // Should only display text if all parameters have been filled.
            Logger.info(LogType.Command, "Text command used without parameter");
            return "";
        } else {
            const newUseCount = await this.commands.incrementUseCount(commandName);
            message = await this.replaceCommonVariables(message, newUseCount, user, args);
            return message;
        }
    }

    public async execute(channel: string, user: IUser): Promise<void> {
        // Command doesn't do anything on its own
    }

    private async replaceCommonVariables(message: string, newUseCount: number, user: IUser, args: any[]): Promise<string> {
        // Replace variable with current counter
        // Use after increment since starting with 1 makes more sense.
        if (message.indexOf("{count}") !== -1) {
            message = message.replace(/\{count\}/ig, newUseCount.toString());
        }

        if (message.indexOf("{time}") !== -1) {
            const timezone = await this.settingsService.getValue(BotSettings.Timezone);
            const options: any = timezone ? { timeStyle: "long", timeZone: timezone } : { timeStyle: "long" };
            const time = new Intl.DateTimeFormat("en-US", options).format(new Date());
            message = message.replace(/\{time\}/ig, time);
        }

        message = message.replace(/\{username\}/ig, user.username);

        // Determine uptime of stream
        if (message.indexOf("{uptime}") !== -1) {
            const lastOnline = await this.streamActivityRepository.getLatestForEvent(EventTypes.StreamOnline);
            const lastOffline = await this.streamActivityRepository.getLatestForEvent(EventTypes.StreamOffline);
            let uptime = "(Offline)";
            if (lastOnline) {
                if (lastOffline === undefined || lastOffline.dateTimeTriggered < lastOnline.dateTimeTriggered) {
                    uptime = this.formatUptimeDuration((new Date().getTime() - new Date(lastOnline.dateTimeTriggered).getTime()) / 1000);
                }
            }

            message = message.replace(/\{uptime\}/ig, uptime);
        }

        // If user name with @ is given, provide clean version of user name.
        let userFromParams = "";
        for (const a of args) {
            if (typeof(a) === "string" && a.startsWith("@")) {
                userFromParams = a.substr(1);
                break;
            }
        }

        // Assume first parameter to be user name.
        if (!userFromParams && args.length > 0) {
            userFromParams = args[1];
        }

        message = message.replace(/\{userfromargument\}/ig, userFromParams);
        message = message.replace(/\{useroruserfromargument\}/ig, userFromParams ? userFromParams : user.username);

        if (message.indexOf("{userlaststreaming}") !== -1 && userFromParams) {
            let lastStreaming = "(unknown)";
            try {
                lastStreaming = await this.twitchWebService.getLastChannelCategory(userFromParams);
                if (!lastStreaming) {
                    // Should fit into senteces like "were last seen streaming ..."
                    lastStreaming = "nothing";
                }
            } catch (error: any) {
                Logger.err(LogType.Command, error);
            }

            message = message.replace(/\{userlaststreaming\}/ig, lastStreaming);
        }

        if (message.indexOf("{userfollowage}") !== -1) {
            let followingSince = "(never)";
            try {
                const followDate = await this.twitchWebService.getFollowInfo(userFromParams ? userFromParams : user.username);
                if (followDate) {
                    followingSince = this.formatFollowDuration(moment.duration(moment(new Date()).diff(followDate)));
                }
            } catch (error: any) {
                Logger.err(LogType.Command, error);
            }

            message = message.replace(/\{userfollowage\}/ig, followingSince);
        }

        // Calculate average length of streams for last X days
        if (message.indexOf("{streamaverage7}") !== -1) {
            const resultLength = await this.getStreamAverage(7);
            message = message.replace(/\{streamaverage7\}/ig, resultLength);
        }
        if (message.indexOf("{streamaverage30}") !== -1) {
            const resultLength = await this.getStreamAverage(30);
            message = message.replace(/\{streamaverage30\}/ig, resultLength);
        }

        if (message.indexOf("{streamtotal7}") !== -1) {
            const data = await this.getStreamData(7);
            message = message.replace(/\{streamtotal7\}/ig, this.formatUptimeDuration(data.total / 1000));
        }
        if (message.indexOf("{streamtotal30}") !== -1) {
            const data = await this.getStreamData(30);
            message = message.replace(/\{streamtotal30\}/ig, this.formatUptimeDuration(data.total / 1000));
        }

        return message;
    }

    private async getStreamAverage(days: number): Promise<string> {
        const data = await this.getStreamData(days);

        if (data.count) {
            const averageLength = data.total / data.count;
            return this.formatUptimeDuration(averageLength / 1000);
        } else {
            return "(No streams)";
        }
    }

    private async getStreamData(days: number): Promise<{ count: number, total: number }> {
        const start = new Date();
        start.setUTCHours(0,0,0,0);
        start.setDate(start.getDate() - days);
        const end = new Date();
        end.setUTCHours(0,0,0,0);

        let streamStart = 0;
        let totalStreamTime = 0;
        let streamCount = 0;
        const events = await this.streamActivityRepository.getEventsInRange(start, end);
        if (events.length > 0 && events[events.length - 1].event === EventTypes.StreamOnline) {
            // Find last corresponding stream offline if needed
            const lastOfflineEvents = await this.streamActivityRepository.getLastEvents(EventTypes.StreamOffline, 1, "asc", new Date(events[events.length - 1].dateTimeTriggered));
            if (lastOfflineEvents.length) {
                events.push(lastOfflineEvents[0]);
            }
        }

        for (const event of events) {
            if (event.event === EventTypes.StreamOnline) {
                streamStart = event.dateTimeTriggered;
            } else if (event.event === EventTypes.StreamOffline) {
                if (streamStart) {
                    totalStreamTime += event.dateTimeTriggered - streamStart;
                    streamStart = 0;
                    streamCount++;
                }
            }
        }

        return { count: streamCount, total: totalStreamTime };
    }

    private formatUptimeDuration(durationInSeconds: number): string {
        const hours   = Math.floor(durationInSeconds / 3600);
        const minutes = Math.floor((durationInSeconds - (hours * 3600)) / 60);

        if (hours > 0) {
            return `${hours} hours ${minutes} minutes`;
        } else {
            return `${minutes} minutes`;
        }
    }

    private formatFollowDuration(duration: moment.Duration): string {
        const parts = [];

        // return nothing when the duration is invalid or not correctly parsed (P0D)
        if (!duration || duration.toISOString() === "P0D") return "";

        if (duration.years() >= 1) {
            const years = Math.floor(duration.years());
            parts.push(`${years} ` + (years > 1 ? "years" : "year"));
        }

        if (duration.months() >= 1) {
            const months = Math.floor(duration.months());
            parts.push(`${months} ` + (months > 1 ? "months" : "month"));
        }

        if (duration.days() >= 1) {
            const days = Math.floor(duration.days());
            parts.push(`${days} ` + (days > 1 ? "days" : "day"));
        }

        if (parts.length === 0) {
            if (duration.hours() >= 1) {
                const hours = Math.floor(duration.hours());
                parts.push(`${hours} ` + (hours > 1 ? "hours" : "hour"));
            }

            if (duration.minutes() >= 1) {
                const minutes = Math.floor(duration.minutes());
                parts.push(`${minutes} ` + (minutes > 1 ? "minutes" : "minute"));
            }

            if (parts.length === 0 && duration.seconds() >= 1) {
                const seconds = Math.floor(duration.seconds());
                parts.push(`${seconds} ` + (seconds > 1 ? "seconds" : "second"));
            }
        }

        return parts.join(", ");
    }

    public async getDescription(): Promise<string> {
        return `Displays a message in chat.`;
    }
}

export default TextCommand;
