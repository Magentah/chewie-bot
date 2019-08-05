export class TwitchChatParser {
    /**
     * Helper function to check whether a message contains a command.
     * @param message Message to parse
     * @param commandSymbol Symbol to check that is used to denote a command. Defaults to '!'.
     * @returns True if a command has been found, false if a command hasn't been found.
     */
    public static hasCommand(message: string, commandSymbol: string = '!'): boolean {
        return (message.indexOf(commandSymbol) === 0);
    }

    /**
     * Helper function to get a command name from a message if one exists.
     * @param message Message to parse.
     * @returns Command name if it exists. undefined if a command doesn't exist.
     */
    public static getCommandName(message: string): string | undefined {
        if (TwitchChatParser.hasCommand(message)) {
            if (message.indexOf(' ') > -1) {
                return message.slice(1, message.indexOf(' ')).toLowerCase();
            } else {
                return message.slice(1).toLowerCase();
            }
        } else {
            return undefined;
        }
    }
}

export default TwitchChatParser;
