import { inject, injectable } from "inversify";
import { DatabaseTables, DatabaseProvider } from "../services/databaseService";
import { IQuote } from "../models";

@injectable()
export class QuotesRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async getById(id: number): Promise<IQuote> {
        const databaseService = await this.databaseProvider();
        const quote = await databaseService
            .getQueryBuilder(DatabaseTables.Quotes)
            .first()
            .where({id});

        return quote as IQuote;
    }

    public async getByTextSearch(searchTerm: string): Promise<IQuote> {
        const databaseService = await this.databaseProvider();
        let quote = await databaseService
            .getQueryBuilder(DatabaseTables.Quotes)
            .first()
            .where('text', 'like', `%${searchTerm}%`)
            .orWhere('author', 'like', `%${searchTerm}%`);

        return quote as IQuote;
    }

    public async random(): Promise<IQuote> {
        const databaseService = await this.databaseProvider();
        const quote = await databaseService
            .getQueryBuilder(DatabaseTables.Quotes)
            .first()
            .orderByRaw("RANDOM()");

        return quote as IQuote;
    }

    public async quoteExists(author: string, text: string): Promise<boolean> {
        const databaseService = await this.databaseProvider();
        const quote = await databaseService
                .getQueryBuilder(DatabaseTables.Quotes)
                .first()
                .where({author, text});

        if (!quote) {
            return false;
        }
        return true;
    }

    public async add(quote: IQuote): Promise<number> {
        const databaseService = await this.databaseProvider();
        const insert = await databaseService.getQueryBuilder(DatabaseTables.Quotes).insert(quote);

        return insert[0];
    }

    public async delete(id: number): Promise<boolean> {
        const databaseService = await this.databaseProvider();
        const deleted = await databaseService.getQueryBuilder(DatabaseTables.Quotes).delete().where({ id });

        return deleted==1;
    }
}

export default QuotesRepository;
