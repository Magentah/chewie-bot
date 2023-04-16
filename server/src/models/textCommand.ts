export enum TextCommandMessagType {
    Plaintext = 0,
    AiPrompt = 1,
    // Potentially more options like execute script language
    // Script = 2,
}

export interface IGenerateTextData {
    prompt: string;
    fallback: string;
    timeout?: number;
}

export interface ITextGenerationResult {
    id?: number;
    commandId?: number;
    key: string;
    result: string;
    time: number
}

export default interface ITextCommand {
    id?: number;
    commandName: string;
    message: string;
    minimumUserLevel?: number;
    useCount: number;
    useCooldown: boolean;
    messageType: TextCommandMessagType;
}
