import { BotContainer } from "../inversify.config";
import { BotSettingsService, TwitchService } from "../services";
import { IUser, UserLevels, ICommandAlias } from "../models";
import { BotSettings } from "../services/botSettingsService";

export abstract class Command {
    protected isInternalCommand: boolean = false;
    protected minimumUserLevel: UserLevels = UserLevels.Viewer;
    protected twitchService: TwitchService;
    protected description: string = "";
    protected settingsService: BotSettingsService;

    constructor() {
        this.twitchService = BotContainer.get(TwitchService);
        this.settingsService = BotContainer.get(BotSettingsService);
    }

    public execute(channel: string, user: IUser, ...args: any[]): void {
        if (user && user.userLevel && user.userLevel >= this.minimumUserLevel) {
            this.executeInternal(channel, user, ...args);
        } else {
            this.twitchService.sendMessage(channel, `${user.username}, you do not have permissions to execute this command.`);
        }
    }

    protected async isReadOnly(channel: string): Promise<boolean> {
        if (await this.settingsService.getBoolValue(BotSettings.ReadonlyMode)) {
            this.twitchService.sendMessage(channel, "Command disabled because of read-only mode.");
            return true;
        } else {
            return false;
        }
    }

    protected executeInternal(channel: string, user: IUser, ...args: any[]): void {
        // Empty
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
