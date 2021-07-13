import { Command } from "../../command";
import { QuotesRepository } from "../../../database";
import { IUser, UserLevels } from "../../../models";
import { BotContainer } from "../../../inversify.config";

export default class AddQuoteCommand extends Command {
    private quotesRepository: QuotesRepository;

    constructor() {
        super();

        this.quotesRepository = BotContainer.get(QuotesRepository);

        this.minimumUserLevel = UserLevels.Moderator;
    }

    public async executeInternal(channel: string, user: IUser, author: string, text: string): Promise<void> {
        if (typeof author !== 'string' || typeof text !== 'string') {
            this.twitchService.sendMessage(channel, `Arguments must be strings.` );
            return;
        }
        if (author.trim() === "" || text.trim() === "") {
            this.twitchService.sendMessage(channel, `Missing arguments, use !addquote <author> <text> to add a quote.` );
            return;
        }

        let quoteExists = await this.quotesRepository.quoteExists(author, text);
        if (!quoteExists) {
            let quote = {
                text,
                author,
                dateAdded: new Date(),
                addedByUserName: user.username
            };

            const id = await this.quotesRepository.add(quote);
            await this.twitchService.sendMessage(channel, `Quote by ${author} has been added with id #${id}`);
        } else {
            this.twitchService.sendMessage(channel, `This quote already exists.` );
        }
    }

    public getDescription(): string {
        return `Saves a quote to the database with author (the person who said it), text and date. Usage: !addquote <author> <text>`;
    }
}