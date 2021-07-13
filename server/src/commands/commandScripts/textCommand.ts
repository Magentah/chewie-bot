import { Command } from "../command";
import { EventTypes, IUser } from "../../models";
import Logger, { LogType } from "../../logger";
import { BotContainer } from "../../inversify.config";
import { StreamActivityRepository, TextCommandsRepository } from "../../database";
import { BotSettingsService } from "../../services";
import { BotSettings } from "../../services/botSettingsService";

// I think it's better to have a "command" to handle all text commands instead of having the
// command service directly call the twitchservice.sendmessage with the text command.
// This is only supposed to be used by the bot for internal use.
export class TextCommand extends Command {
    private readonly cooldowns: { [name: string] : boolean; } = {};

    private commands: TextCommandsRepository;
    private settingsService: BotSettingsService;
    private streamActivityRepository: StreamActivityRepository;

    constructor() {
        super();

        this.isInternalCommand = true;
        this.commands = BotContainer.get(TextCommandsRepository);
        this.settingsService = BotContainer.get(BotSettingsService);
        this.streamActivityRepository = BotContainer.get(StreamActivityRepository);
    }

    public async execute(channel: string, user: IUser, commandName: string, useCooldown: boolean, ...args: any[]): Promise<void> {
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

            message = await this.ReplaceCommonVariables(message, newUseCount, user);

            this.twitchService.sendMessage(channel, message);
        }
    }

    private async ReplaceCommonVariables(message: string, newUseCount: number, user: IUser): Promise<string> {
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
                    uptime = this.formatDuration((new Date().getTime() - new Date(lastOnline.dateTimeTriggered).getTime()) / 1000);
                }
            }

            message = message.replace(/\{uptime\}/ig, uptime);
        }

        return message;
    }

    private formatDuration(durationInSeconds: number): string {
        const hours   = Math.floor(durationInSeconds / 3600);
        const minutes = Math.floor((durationInSeconds - (hours * 3600)) / 60);
        const seconds = durationInSeconds - (hours * 3600) - (minutes * 60);

        if (hours > 0) {
            return `${hours} hours ${minutes} minutes`;
        } else {
            return `${minutes} minutes`;
        }
    }
}

export default TextCommand;
