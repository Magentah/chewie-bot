import Logger, { LogType } from "./logger";

/**
 * Provides access to texts that are meant to be shown to users.
 */
export class Lang {
    private static texts: Map<string, string> = new Map<string, string>();

    public static register(key: string, value: string) {
        this.texts.set(key, value);
    }

    public static get(key: string, ...values: any[]): string {
        let text = this.texts.get(key);
        if (!text) {
            Logger.warn(LogType.Language, `Text for key "${key}" not found.`);
            return "";
        }

        // Replace any $X variable with the corresponding argument.
        for (let i = 1; i <= values.length; i++) {
            let argumentFound = false;
            while (text.indexOf("$" + i) >= 0) {
                text = text.replace("$" + i, values[i - 1]);
                argumentFound = true;
            }

            if (!argumentFound) {
                Logger.warn(LogType.Language, `Argument ${i} in text for key "${key}" not found.`);
            }
        }

        return text;
    }
}

