export enum CommandSettings {
    Disabled = "disabled",
}

export default interface ICommandSettings {
    commandName: string;
    key: CommandSettings;
    value: string;
}
