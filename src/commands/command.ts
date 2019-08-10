import UserLevels, { IUserLevel } from '../database/userLevels';
import { IUser } from '../database/users';
import { BotContainer } from '../inversify.config';

export abstract class Command {
    protected isInternalCommand: boolean = false;
    protected minimumUserLevel: IUserLevel = {} as IUserLevel;

    public execute(channel: string, user: IUser, ...args: any[]): void {
        // Empty
    }

    public isInternal(): boolean {
        return this.isInternalCommand;
    }
}
