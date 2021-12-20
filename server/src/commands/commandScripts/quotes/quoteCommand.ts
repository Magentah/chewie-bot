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

    public async executeInternal(channel: string, user: IUser, ...searchTerm: string[]): Promise<void> {
        let quote;

        if (!searchTerm) {
            quote = await this.quotesRepository.random();
        } else {
            const id = parseInt(searchTerm[0]);
            if (id) {
                quote = await this.quotesRepository.getById(id);
            } else {
                quote = await this.quotesRepository.getByTextSearch(searchTerm.join(" "));
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

            this.twitchService.sendMessage(channel, `» ${quote.text} « (${quote.author} - ${date}, #${quote.id})`);
        }
    }

    public getDescription(): string {
        return `Searches for a quote that contains the given term or ID. Usage: !quote <search>`;
    }
}