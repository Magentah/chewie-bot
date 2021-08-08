export default interface ITextCommand {
    id?: number;
    commandName: string;
    message: string;
    minimumUserLevel?: number;
    useCount: number;
    useCooldown: boolean;
}
