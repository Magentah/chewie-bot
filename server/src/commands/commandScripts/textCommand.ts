import { Command } from "../command";
import { TwitchService } from "../../services";
import { IUser } from "../../models";
import { BotContainer } from "../../inversify.config";

// I think it's better to have a "command" to handle all text commands instead of having the
// command service directly call the twitchservice.sendmessage with the text command.
// This is only supposed to be used by the bot for internal use.
export class TextCommand extends Command {
    constructor() {
        super();

        this.isInternalCommand = true;
    }

    public execute(channel: string, user: IUser, message: string): void {
        this.twitchService.sendMessage(channel, message);
    }
}

export default TextCommand;
