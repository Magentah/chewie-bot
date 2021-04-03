import { UserLevels } from "./userLevel";

export enum CommandType {
    Text,
    Alias,
    System
}

export default interface ICommandInfo {
    id?: number;
    commandName: string;
    content: string;
    type: CommandType;
    minUserLevel?: UserLevels;
}
