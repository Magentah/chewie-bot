import { Command } from "../command";
import { EventTypes, IUser, UserLevels } from "../../models";
import Logger, { LogType } from "../../logger";
import { BotContainer } from "../../inversify.config";
import { StreamActivityRepository, TextCommandsRepository } from "../../database";
import { BotSettings } from "../../services/botSettingsService";
import moment = require("moment");

// I think it's better to have a "command" to handle all text commands instead of having the
// command service directly call the twitchservice.sendmessage with the text command.
// This is only supposed to be used by the bot for internal use.
export class TextCommand extends Command {
    private readonly cooldowns: { [name: string] : boolean; } = {};

    private commands: TextCommandsRepository;
    private streamActivityRepository: StreamActivityRepository;

    constructor() {
        super();

        this.isInternalCommand = true;
        this.commands = BotContainer.get(TextCommandsRepository);
        this.streamActivityRepository = BotContainer.get(StreamActivityRepository);
    }

    public async execute(channel: string, user: IUser, commandName: string, useCooldown: boolean, minUserLevel: UserLevels, ...args: any[]): Promise<void> {
        if (minUserLevel) {
            if (!user?.userLevel || user.userLevel < minUserLevel) {
                this.twitchService.sendMessage(channel, `${user.username}, you do not have permissions to execute this command.` );
                return;
            }
        }

        // Skip command if still in cooldown.
        if (useCooldown) {
            if (this.cooldowns[commandName]) {
                return;
            } else {
                const cooldown = parseInt(await this.settingsService.getValue(BotSettings.CommandCooldownInSeconds), 10);
                this.cooldowns[commandName] = true;
                setTimeout(() => {
                    this.cooldowns[commandName] = false;
                }, cooldown * 1000);
            }
        }

        let message = args[0] as string;

        for (let i = 1; i < args.length; i++) {
            if (args[i]) {
                message = message.replace(`{${i}}`, args[i]);
            }
        }

        const paramCheck = /\{[0-9]\}/;
        if (paramCheck.test(message)) {
            // Should only display text if all parameters have been filled.
            Logger.info(LogType.Command, "Text command used without parameter");
        } else {
            const newUseCount = await this.commands.incrementUseCount(commandName);

            message = await this.ReplaceCommonVariables(message, newUseCount, user, args);

            this.twitchService.sendMessage(channel, message);
        }
    }

    private async ReplaceCommonVariables(message: string, newUseCount: number, user: IUser, args: any[]): Promise<string> {
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

        if (message.indexOf("{userlaststreaming}") !== -1 && userFromParams) {
            let lastStreaming = "(unknown)";
            try {
                lastStreaming = await this.twitchService.getLastChannelCategory(userFromParams);
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
                const followDate = await this.twitchService.getFollowInfo(userFromParams ? userFromParams : user.username);
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

        return message;
    }

    private async getStreamAverage(days: number): Promise<string> {
        const start = new Date();
        start.setDate(start.getDate() - days);
        const end = new Date();
        end.setUTCHours(0,0,0,0);

        let streamStart = 0;
        let totalStreamTime = 0;
        let streamCount = 0;
        for (const event of await this.streamActivityRepository.getEventsInRange(start, end)) {
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

        if (streamCount) {
            const averageLength = totalStreamTime / streamCount;
            return this.formatUptimeDuration(averageLength / 1000);
        } else {
            return "(No streams)";
        }
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
            parts.push(years + " " + (years > 1 ? "years" : "year"));
        }

        if (duration.months() >= 1) {
            const months = Math.floor(duration.months());
            parts.push(months + " " + (months > 1 ? "months" : "month"));
        }

        if (duration.days() >= 1) {
            const days = Math.floor(duration.days());
            parts.push(days + " " + (days > 1 ? "days" : "day"));
        }

        return parts.join(", ");
    }

    public getDescription(): string {
        return `Displays a message in chat.`;
    }
}

export default TextCommand;
