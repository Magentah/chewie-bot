import { Command } from "../command";
import { IUser } from "../../models";
import Logger, { LogType } from "../../logger";

// I think it's better to have a "command" to handle all text commands instead of having the
// command service directly call the twitchservice.sendmessage with the text command.
// This is only supposed to be used by the bot for internal use.
export class TextCommand extends Command {
    constructor() {
        super();

        this.isInternalCommand = true;
    }

    public execute(channel: string, user: IUser, ...args: any[]): void {
        let message = args[0] as string;

        for (let i = 1; i < args.length; i++) {
            if (args[i]) {
                message = message.replace(`{${i}}`, args[i]);
            }
        }

        const paramCheck = /\{[0-9]\}/;
        if (paramCheck.test(message)) {
            // Should only display text if all parameters have been filled.
            Logger.info(LogType.Command, "Text command used without parameter");
        } else {
            this.twitchService.sendMessage(channel, message);
        }
    }
}

export default TextCommand;
