import { BotContainer } from "../inversify.config";
import { TwitchService } from "../services";
import { IUser, UserLevels, ICommandAlias } from "../models";

export abstract class Command {
    protected isInternalCommand: boolean = false;
    protected minimumUserLevel: UserLevels = UserLevels.Viewer;
    protected twitchService: TwitchService;

    constructor() {
        this.twitchService = BotContainer.get(TwitchService);
    }

    public execute(channel: string, user: IUser, ...args: any[]): void {
        if (user && user.userLevel && user.userLevel.rank >= this.minimumUserLevel) {
            this.executeInternal(channel, user, ...args);
        } else {
            this.twitchService.sendMessage(channel, `${user.username}, you do not have permissions to execute this command.` );
        }
    }

    protected executeInternal(channel: string, user: IUser, ...args: any[]): void {
        // Empty
    }

    public getAliases(): ICommandAlias[] {
        return [];
    }

    public isInternal(): boolean {
        return this.isInternalCommand;
    }

    public shouldExecuteOnMessage(message: string): boolean {
        return false;
    }
}
