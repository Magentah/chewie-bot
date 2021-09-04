import { inject, injectable } from "inversify";
import { DatabaseTables, DatabaseProvider } from "../services/databaseService";
import { ICommandAlias } from "../models";

@injectable()
export class CommandAliasesRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async getList(): Promise<ICommandAlias[]> {
        const databaseService = await this.databaseProvider();
        const commandAlias = await databaseService
            .getQueryBuilder(DatabaseTables.CommandAliases)
            .select();
        return commandAlias as ICommandAlias[];
    }

    public async getById(id: number): Promise<ICommandAlias> {
        const databaseService = await this.databaseProvider();
        const commandAlias = await databaseService
            .getQueryBuilder(DatabaseTables.CommandAliases)
            .first()
            .where({ id });
        return commandAlias as ICommandAlias;
    }

    public async get(alias: string): Promise<ICommandAlias> {
        const databaseService = await this.databaseProvider();
        const commandAlias = await databaseService
            .getQueryBuilder(DatabaseTables.CommandAliases)
            .first()
            .where({ alias });
        return commandAlias as ICommandAlias;
    }

    public async add(command: ICommandAlias): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.CommandAliases).insert(command);
    }

    public async update(alias: ICommandAlias): Promise<void> {
        const databaseService = await this.databaseProvider();
        const commandArguments = alias.commandArguments ?? "";

        await databaseService
            .getQueryBuilder(DatabaseTables.CommandAliases)
            .update({ alias: alias.alias, commandName: alias.commandName, commandArguments })
            .where({ id: alias.id });
    }
    
    public async delete(alias: ICommandAlias | string): Promise<boolean> {
        const databaseService = await this.databaseProvider();
        if (typeof alias === "string") {
            const toDelete = await this.get(alias);
            if (toDelete) {
                await databaseService.getQueryBuilder(DatabaseTables.CommandAliases).delete().where({ id: toDelete.id });
                return true;
            }
        } else if (alias.id && this.get(alias.commandName)) {
            await databaseService.getQueryBuilder(DatabaseTables.CommandAliases).delete().where({ id: alias.id });
            return true;
        }

        return false;
    }
}

export default CommandAliasesRepository;
