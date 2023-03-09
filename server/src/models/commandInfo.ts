import { UserLevels } from "./userLevel";

export enum CommandType {
    Text,
    Alias,
    System,
    TextGeneration
}

export default interface ICommandInfo {
    id?: number;
    commandName: string;
    content: string;
    type: CommandType;
    minUserLevel?: UserLevels;
    useCount?: number;
    useCooldown?: boolean;
}
