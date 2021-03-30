import { inject, injectable } from "inversify";
import { DatabaseTables, DatabaseProvider } from "../services/databaseService";
import { GameEventType, GameMessageType, IGameMessage } from "../models";

@injectable()
export default class MessagesRepository {
    constructor(@inject("DatabaseProvider") private databaseProvider: DatabaseProvider) {
        // Empty
    }

    public async getList(): Promise<IGameMessage[]> {
        const databaseService = await this.databaseProvider();
        const messages = await databaseService.getQueryBuilder(DatabaseTables.Messages);
        return messages as IGameMessage[];
    }

    public async get(message: IGameMessage): Promise<IGameMessage | undefined> {
        if (!message.id) {
            return undefined;
        }

        const databaseService = await this.databaseProvider();
        const messages = await databaseService.getQueryBuilder(DatabaseTables.Messages).where({ id: message.id }).first();
        return messages as IGameMessage;
    }

    public async getByType(eventType: GameEventType, type: GameMessageType): Promise<IGameMessage[]> {
        const databaseService = await this.databaseProvider();
        const messages = await databaseService.getQueryBuilder(DatabaseTables.Messages).where({ type, eventType });
        return messages as IGameMessage[];
    }

    public async addOrUpdate(message: IGameMessage): Promise<IGameMessage> {
        const existingMessage = await this.get(message);
        if (!existingMessage) {
            const databaseService = await this.databaseProvider();
            const result = await databaseService.getQueryBuilder(DatabaseTables.Messages).insert(message);
            message.id = result[0];
            return message;
        } else {
            const databaseService = await this.databaseProvider();
            await databaseService.getQueryBuilder(DatabaseTables.Messages).where({ id: message.id }).update(message);
            return message;
        }
    }

    public async delete(message: IGameMessage): Promise<boolean> {
        const databaseService = await this.databaseProvider();
        if (message.id) {
            await databaseService
                .getQueryBuilder(DatabaseTables.Messages)
                .where({ id: message.id })
                .delete();
            return true;
        }

        return false;
    }
}
