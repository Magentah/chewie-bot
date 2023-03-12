import { injectable, inject } from "inversify";
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import BotSettingsService, { BotSettings } from "./botSettingsService";

@injectable()
export default class OpenAiService {
    constructor(@inject(BotSettingsService) private botSettings: BotSettingsService) {
        // Empty
    }

    public async generateText(input: string, beCreative: boolean): Promise<string> {
        const apiKey = await this.botSettings.getValue(BotSettings.OpenAiApiKey);
        if (!apiKey) {
            return "";
        }

        const configuration = new Configuration({ apiKey });
        const openai = new OpenAIApi(configuration);

        const messages = [
            {"role": "user", "content": input} as ChatCompletionRequestMessage,
        ];

        const completion = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages,
            temperature: beCreative ? undefined : 0
        });

        if (completion.data.choices.length === 0 || completion.data.choices[0].finish_reason !== "stop") {
            return "";
        } else {
            let msg = completion.data.choices[0].message?.content ?? "";
            msg = msg.trim();

            // When asked to write a messge, quotes can be included and we don't want these.
            if (msg.startsWith("\"") && msg.endsWith("\"")) {
                msg = msg.substring(1);
                msg = msg.substring(0, msg.length - 2);
            }

            return msg;
        }
    }
}
