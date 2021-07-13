export default interface ITextCommand {
    id?: number;
    commandName: string;
    message: string;
    minimumUserLevelKey?: number;
    useCount: number;
    useCooldown: boolean;
}
