import * as crypto from "crypto";
import * as http from "http";
import * as Config from "../config.json";
import { Logger, LogType } from "../logger";
import { TwitchMessageSignatureError } from "../errors";

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

    /**
     * Splits string into separate command arguments. Only accepts double quotes.
     * @param text Raw argument text
     * @returns Array of command arguments.
     */
    private static commandArgs2Array(text: string): any[] {
        if (!text) {
            return [];
        }

        const resultArgs: any[] = [];
        let inString = false;
        let currentArg = "";
        for (let i = 0; i < text.length; i++) {
            if (text[i] === "\"") {
                // Check for escaped quote, use as regular text.
                if (text[i + 1] === "\"") {
                    currentArg += text[i];
                    i++;
                } else if (inString) {
                    resultArgs.push(currentArg);
                    currentArg = "";
                    inString = false;
                } else {
                    inString = true;
                }
            } else if (text[i] === " ") {
                // Space: Make next argument, unless in string.
                if (inString) {
                    currentArg += text[i];
                } else if (currentArg) {
                    resultArgs.push(currentArg);
                    currentArg = "";
                } else {
                    // Ignore space at the start of an argument.
                }
            } else {
                currentArg += text[i];
            }
        }

        if (currentArg) {
            resultArgs.push(currentArg);
        }

        // Bot currently relies on numbers always being positive.
        // Also need to convert numbers to actual number values.
        for (let i = 0; i < resultArgs.length; i++) {
            const numbericValue = Number(resultArgs[i]);
            if (!isNaN(numbericValue)) {
                if (numbericValue < 0) {
                    resultArgs[i] = NaN;
                } else {
                    resultArgs[i] = numbericValue;
                }
            }
        }

        return resultArgs;
    }

    public static getCommandArgs(message: string): string[] | undefined {
        if (TwitchHelper.hasCommand(message)) {
            if (message.indexOf(" ") > -1) {
                const commandArgs = message.slice(message.indexOf(" ")).trim();
                const args = TwitchHelper.commandArgs2Array(commandArgs);
                return args;
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
                .createHmac("sha256", Config.twitch.eventSub.secret)
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
