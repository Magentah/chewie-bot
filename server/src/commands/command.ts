import { BotContainer } from "../inversify.config";
import { BotSettingsService, TwitchService, TwitchWebService } from "../services";
import { IUser, UserLevels, ICommandAlias, CommandSettings } from "../models";
import { BotSettings } from "../services/botSettingsService";
import { CommandSettingsRepository } from "../database";

export abstract class Command {
    protected isInternalCommand = false;
    protected minimumUserLevel: UserLevels = UserLevels.Viewer;
    protected twitchService: TwitchService;
    protected description = "";
    protected settingsService: BotSettingsService;
    protected twitchWebService;
    protected commandSettings: CommandSettingsRepository;
    private commandName = "";

    constructor() {
        this.twitchService = BotContainer.get(TwitchService);
        this.settingsService = BotContainer.get(BotSettingsService);
        this.twitchWebService = BotContainer.get(TwitchWebService);
        this.commandSettings = BotContainer.get(CommandSettingsRepository);
    }

    public async execute(channel: string, user: IUser, ...args: any[]): Promise<void> {
        if (user && user.userLevel && user.userLevel >= this.minimumUserLevel) {
            if (await this.commandSettings.getValue(this.commandName, CommandSettings.Disabled) === "1") {
                await this.twitchService.sendMessage(channel, `Command \"${this.commandName}\" is currently disabled.`);
                return;
            }

            this.executeInternal(channel, user, ...args);
        } else {
            await this.twitchService.sendMessage(channel, `${user.username}, you do not have permissions to execute this command.`);
        }
    }

    protected async isReadOnly(channel: string): Promise<boolean> {
        if (await this.settingsService.getBoolValue(BotSettings.ReadonlyMode)) {
            await this.twitchService.sendMessage(channel, "Command disabled because of read-only mode.");
            return true;
        } else {
            return false;
        }
    }

    protected executeInternal(channel: string, user: IUser, ...args: any[]): void {
        // Empty
    }

    public getName(): string {
        return this.commandName;
    }

    public setName(commandName: string): void {
        this.commandName = commandName;
    }

    public getAliases(): ICommandAlias[] {
        return [];
    }

    public getMinimumUserLevel(): UserLevels {
        return this.minimumUserLevel;
    }

    public isInternal(): boolean {
        return this.isInternalCommand;
    }

    public shouldExecuteOnMessage(message: string): boolean {
        return false;
    }

    public async getDescription(): Promise<string> {
        return this.description;
    }
}
