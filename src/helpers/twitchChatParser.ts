// There's no type declarations for this, but we only need it to parse chat command arguments and it's easy enough to use without them.
// tslint:disable-next-line: no-var-requires
const parser = require('minimist-string');

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

    /** 
     * Parses command arguements from an arbitrary message
     * @param message 
     */
    public static getCommandArgs(message: string): string[] | undefined {
        if (TwitchChatParser.hasCommand(message)) {
            if (message.indexOf(' ') > -1) {
                // parser will return an object and can have kvp args, but they should never happen for chat commands.
                // just in case, we remove all -- as they're used to indicate arg names.
                message = message.replace('--', '');
                const args = parser(message.slice(message.indexOf(' ')).trim());
                return args._ as string[];
            }
        }
        return undefined;
    }

    /** 
     * Parses channel strings to username string.
     * @param channel name of channel (e.g #chewiemelodies)
     * @param channelSymbol channel Postfix
     */
    public static channelToUsername(channel: string | undefined, channelSymbol: string = "#"){
        if (channel && channel.indexOf(channelSymbol) === 0){
            return channel.slice(1);
        }
        return channel;
    }
}

export default TwitchChatParser;
