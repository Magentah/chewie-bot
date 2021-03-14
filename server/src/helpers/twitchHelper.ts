// There's no type declarations for this, but we only need it to parse chat command arguments and it's easy enough to use without them.
// tslint:disable-next-line: no-var-requires
const parser = require("minimist-string");
import * as crypto from "crypto";
import * as http from "http";
import { Logger, LogType } from "../logger";
import { TwitchMessageSignatureError } from "../errors";
import { HttpTransportInstance } from "winston/lib/winston/transports";

export class TwitchHelper {
    /**
     * Helper function to check whether a message contains a command.
     * @param message Message to parse
     * @param commandSymbol Symbol to check that is used to denote a command. Defaults to '!'.
     * @returns True if a command has been found, false if a command hasn't been found.
     */
    public static hasCommand(message: string, commandSymbol: string = "!"): boolean {
        return message.indexOf(commandSymbol) === 0;
    }

    /**
     * Helper function to get a command name from a message if one exists.
     * @param message Message to parse.
     * @returns Command name if it exists. undefined if a command doesn't exist.
     */
    public static getCommandName(message: string): string | undefined {
        if (TwitchHelper.hasCommand(message)) {
            if (message.indexOf(" ") > -1) {
                return message.slice(1, message.indexOf(" ")).toLowerCase();
            } else {
                return message.slice(1).toLowerCase();
            }
        } else {
            return undefined;
        }
    }

    public static getCommandArgs(message: string): string[] | undefined {
        if (TwitchHelper.hasCommand(message)) {
            if (message.indexOf(" ") > -1) {
                // parser will return an object and can have kvp args, but they should never happen for chat commands.
                // just in case, we remove all -- as they're used to indicate arg names.
                message = message.replace("--", "");
                const args = parser(message.slice(message.indexOf(" ")).trim());
                return args._ as string[];
            }
        }
        return undefined;
    }

    /**
     * Function that verifies the HMAC-SHA256 signature for Twitch EventSub Messages.
     * Throws an error if the signature does not match to prevent further processing.
     *
     * @see https://dev.twitch.tv/docs/eventsub#verify-a-signature
     * @param req Http Request
     * @param res Http Response
     * @param buf ByteArray buffer of the raw request body
     * @param encoding Character encoding for the body
     */
    public static verifyTwitchEventsubSignature(
        req: http.IncomingMessage,
        res: http.ServerResponse,
        buf: Buffer,
        encoding: string
    ): void {
        if (req.headers && req.headers["twitch-eventsub-message-signature"]) {
            const id: string = req.headers["twitch-eventsub-message-id"] as string;
            const timestamp: string = req.headers["twitch-eventsub-message-timestamp"] as string;
            const sha = crypto
                .createHmac("sha256", "asdfghaslkdjash")
                .update(id + timestamp + buf)
                .digest("hex");
            const signature = `sha256=${sha}`;
            const match: boolean = signature === req.headers["twitch-eventsub-message-signature"];
            if (!match) {
                throw new TwitchMessageSignatureError("The Twitch EventSub Message Signature does not match.");
            } else {
                Logger.info(LogType.Twitch, "Twitch EventSub Message Signature OK");
            }
        }
    }
}

export default TwitchHelper;
