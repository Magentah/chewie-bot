import { inject, injectable } from "inversify";
import { UserLevelsRepository } from "src/database";
import { EventService, UserService } from "src/services";
import { IUser, UserLevels, ICommandAlias } from "../models";
import TwitchService from "../services/twitchService";

export abstract class Command {
    protected isInternalCommand: boolean = false;
    protected minimumUserLevel: UserLevels = UserLevels.Viewer;

    constructor() {}

    public execute(channel: string, user: IUser, ...args: any[]): void {
        // Empty
    }

    public getAliases(): ICommandAlias[] {
        return [];
    }

    public isInternal(): boolean {
        return this.isInternalCommand;
    }
}
