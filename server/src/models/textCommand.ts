export default interface ITextCommand {
    id?: number;
    commandName: string;
    message: string;
    minimumModLevel?: number;
    useCount: number;
    useCooldown: boolean;
}
