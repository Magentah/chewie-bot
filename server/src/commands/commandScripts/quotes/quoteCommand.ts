import { Command } from "../../command";
import { QuotesRepository } from "../../../database";
import { IUser } from "../../../models";
import { BotContainer } from "../../../inversify.config";

export default class QuoteCommand extends Command {
    private quotesRepository: QuotesRepository;

    constructor() {
        super();

        this.quotesRepository = BotContainer.get(QuotesRepository);
    }

    public async executeInternal(channel: string, user: IUser, searchTerm: any): Promise<void> {
        let quote;

        if (!searchTerm) {
            quote = await this.quotesRepository.random();
        } else {
            const id = parseInt(searchTerm);
            if (id) {
                quote = await this.quotesRepository.getById(searchTerm);
            } else {
                quote = await this.quotesRepository.getByTextSearch(searchTerm);
            }
        }

        if (!quote) {
            quote = await this.quotesRepository.random();
        }

        if (quote) {
            const dateOptions: Intl.DateTimeFormatOptions = {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            };
            const date = new Date(quote.dateAdded).toLocaleDateString('en-US', dateOptions);

            this.twitchService.sendMessage(channel, `#${quote.id} - "${quote.text}", ${quote.author} (${date})` );
        }
    }

    public getDescription(): string {
        return `Searches for a quote that contains the given term or ID. Usage: !quote <search>`;
    }
}