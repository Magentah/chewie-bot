import { inject, injectable } from "inversify";
import { DatabaseTables, DatabaseProvider } from "../services/databaseService";
import { ITextCommand } from "../models";

@injectable()
export class TextCommandsRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async getList(): Promise<ITextCommand[]> {
        const databaseService = await this.databaseProvider();
        const commands = await databaseService
            .getQueryBuilder(DatabaseTables.TextCommands)
            .select();
        return commands as ITextCommand[];
    }

    public async get(commandName: string): Promise<ITextCommand> {
        const databaseService = await this.databaseProvider();
        const command = await databaseService
            .getQueryBuilder(DatabaseTables.TextCommands)
            .first()
            .where({ commandName });
        return command as ITextCommand;
    }

    public async add(command: ITextCommand): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService.getQueryBuilder(DatabaseTables.TextCommands).insert(command);
    }

    // TS function overloading is weird. Need to declare all functions, then have a single implementation to handle all definitions.
    public async update(command: ITextCommand): Promise<void>;
    public async update(commandName: string, message: string): Promise<void>;
    public async update(command: any, message?: string): Promise<void> {
        const databaseService = await this.databaseProvider();
        if (message && typeof command === "string") {
            await databaseService
                .getQueryBuilder(DatabaseTables.TextCommands)
                .update({ message })
                .where({ commandName: command });
        } else {
            await databaseService
                .getQueryBuilder(DatabaseTables.TextCommands)
                .update({ command })
                .where({ id: command.id });
        }
    }

    public async delete(command: ITextCommand | string): Promise<boolean> {
        const databaseService = await this.databaseProvider();
        if (typeof command === "string") {
            const toDelete = await this.get(command);
            if (toDelete) {
                await databaseService.getQueryBuilder(DatabaseTables.TextCommands).delete().where({ id: toDelete.id });
                return true;
            }
        } else if (command.id && this.get(command.commandName)) {
            await databaseService.getQueryBuilder(DatabaseTables.TextCommands).delete().where({ id: command.id });
            return true;
        }

        return false;
    }
}

export default TextCommandsRepository;
