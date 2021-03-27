import { inject, injectable } from "inversify";
import { DatabaseTables, DatabaseProvider } from "../services/databaseService";
import { IQuote } from "../models";

@injectable()
export class QuotesRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async get(id: number): Promise<IQuote> {
        const databaseService = await this.databaseProvider();
        const quote = await databaseService
            .getQueryBuilder(DatabaseTables.Quotes)
            .first()
            .where({id});

        return quote as IQuote;
    }

    public async search(searchTerm: string): Promise<IQuote> {
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
            .whereRaw("id >= (abs(random()) % (SELECT max(id) FROM quotes))");

        return quote as IQuote;
    }

    public async quoteExists(author: string, text: string): Promise<boolean> {
        const databaseService = await this.databaseProvider();
        const quote = await databaseService
                .getQueryBuilder(DatabaseTables.Quotes)
                .first()
                .where({author, text});

        if(!quote) {
            return false;
        }
        return true;
    }

    public async add(quote: IQuote): Promise<IQuote> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.Quotes).insert(quote);

        return await databaseService
            .getQueryBuilder(DatabaseTables.Quotes)
            .first()
            .orderBy("id", "desc") as IQuote;
    }

    public async delete(id: number): Promise<boolean> {
        const databaseService = await this.databaseProvider();
        const toDelete = await this.get(id);
        if (toDelete) {
            await databaseService.getQueryBuilder(DatabaseTables.Quotes).delete().where({ id: toDelete.id });
            return true;
        }
        return false;
    }
}

export default QuotesRepository;
