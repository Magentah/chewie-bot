import { inject, injectable } from "inversify";
import { Tables, DatabaseProvider } from "../services/databaseService";
import { ITextCommand } from "../models/textCommand";

@injectable()
export class TextCommandsRepository {
    constructor(
        @inject("DatabaseProvider") private databaseProvider: DatabaseProvider
    ) {
        // Empty
    }

    public async get(commandName: string): Promise<ITextCommand> {
        const databaseService = await this.databaseProvider();
        const userLevel = await databaseService
            .getQueryBuilder(Tables.TextCommands)
            .first()
            .where({ commandName });
        return userLevel as ITextCommand;
    }

    public async add(command: ITextCommand): Promise<void> {
        const databaseService = await this.databaseProvider();
        await databaseService
            .getQueryBuilder(Tables.TextCommands)
            .insert(command);
    }

    // TS function overloading is weird. Need to declare all functions, then have a single implementation to handle all definitions.
    public async update(command: ITextCommand): Promise<void>;
    public async update(commandName: string, message: string): Promise<void>;
    public async update(command: any, message?: string): Promise<void> {
        const databaseService = await this.databaseProvider();
        if (message && typeof command === "string") {
            await databaseService
                .getQueryBuilder(Tables.TextCommands)
                .update({ message })
                .where({ commandName: command });
        } else {
            await databaseService
                .getQueryBuilder(Tables.TextCommands)
                .update({ command })
                .where({ id: command.id });
        }
    }

    public async delete(command: ITextCommand | string): Promise<boolean> {
        const databaseService = await this.databaseProvider();
        if (typeof command === "string") {
            const toDelete = await this.get(command);
            if (toDelete) {
                await databaseService
                    .getQueryBuilder(Tables.TextCommands)
                    .delete()
                    .where({ id: toDelete.id });
                return true;
            }
        } else if (command.id && this.get(command.commandName)) {
            await databaseService
                .getQueryBuilder(Tables.TextCommands)
                .delete()
                .where({ id: command.id });
            return true;
        }

        return false;
    }
}

export default TextCommandsRepository;
