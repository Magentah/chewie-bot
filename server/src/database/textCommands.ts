import { inject, injectable } from "inversify";
import DatabaseService, { Tables } from "../services/databaseService";
import { ITextCommand } from "../models/textCommand";

@injectable()
export class TextCommandsRepository {
    constructor(@inject(DatabaseService) private databaseService: DatabaseService) {
        // Empty
    }

    public async get(commandName: string): Promise<ITextCommand> {
        const userLevel = await this.databaseService
            .getQueryBuilder(Tables.TextCommands)
            .first()
            .where({ commandName });
        return userLevel as ITextCommand;
    }

    public async add(command: ITextCommand): Promise<void> {
        await this.databaseService.getQueryBuilder(Tables.TextCommands).insert(command);
    }

    // TS function overloading is weird. Need to declare all functions, then have a single implementation to handle all definitions.
    public async update(command: ITextCommand): Promise<void>;
    public async update(commandName: string, message: string): Promise<void>;
    public async update(command: any, message?: string): Promise<void> {
        if (message && typeof command === "string") {
            await this.databaseService
                .getQueryBuilder(Tables.TextCommands)
                .update({ message })
                .where({ commandName: command });
        } else {
            await this.databaseService
                .getQueryBuilder(Tables.TextCommands)
                .update({ command })
                .where({ id: command.id });
        }
    }

    public async delete(command: ITextCommand | string): Promise<boolean> {
        if (typeof command === "string") {
            const toDelete = await this.get(command);
            if (toDelete) {
                await this.databaseService.getQueryBuilder(Tables.TextCommands).delete().where({ id: toDelete.id });
                return true;
            }
        } else if (command.id && this.get(command.commandName)) {
            await this.databaseService.getQueryBuilder(Tables.TextCommands).delete().where({ id: command.id });
            return true;
        }

        return false;
    }
}

export default TextCommandsRepository;
