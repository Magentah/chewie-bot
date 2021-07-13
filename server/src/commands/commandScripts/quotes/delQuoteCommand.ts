import { Command } from "../../command";
import { QuotesRepository } from "../../../database";
import { IUser, UserLevels } from "../../../models";
import { BotContainer } from "../../../inversify.config";

export default class DelQuoteCommand extends Command {
    private quotesRepository: QuotesRepository;

    constructor() {
        super();

        this.quotesRepository = BotContainer.get(QuotesRepository);

        this.minimumUserLevel = UserLevels.Moderator;
    }

    public async executeInternal(channel: string, user: IUser, id: number): Promise<void> {
        if (typeof id !== 'number') {
            this.twitchService.sendMessage(channel, `Invalid parameter for !delQuote. Id must be a number.` );
            return;
        }

        const deleted = await this.quotesRepository.delete(id);
        if (deleted) {
            await this.twitchService.sendMessage(channel, `Quote #${id} has been deleted`);
        } else {
            this.twitchService.sendMessage(channel, `There is no quote with id: #${id} to be deleted` );
        }
    }

    public getDescription(): string {
        return `Deletes a quote with the given ID from the database. Usage: !delquote <id>`;
    }
}