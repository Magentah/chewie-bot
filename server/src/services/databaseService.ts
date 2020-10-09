import { injectable } from "inversify";
import * as knex from "knex";
import * as Config from "../config.json";
import { Logger, LogType } from "../logger";

export enum DatabaseTables {
    Users = "users",
    UserLevels = "userLevels",
    TextCommands = "textCommands",
    Quotes = "quotes",
    Donations = "donations",
    DonationTypes = "donationTypes",
    VIPLevels = "vipLevels",
}

export type DatabaseProvider = () => Promise<DatabaseService>;

@injectable()
export class DatabaseService {
    constructor() {
        // Swap connection information if the client is mysql.
        // MySQL is used in azure, sqlite for localhost.
        if (this.dbConfig.client === "mysql") {
            this.dbConfig.connection = {
                host: Config.database.connection.host,
                user: Config.database.connection.username,
                password: Config.database.connection.password,
                database: Config.database.connection.name,
            };
        }

        this.db = knex(this.dbConfig);
    }

    private dbConfig: knex.Config = {
        client: Config.database.client,
        connection: {
            filename: Config.database.connection.name,
        },
        debug: true,
        migrations: {
            tableName: "migrations",
        },
        useNullAsDefault: true,
        log: {
            warn(message) {
                Logger.warn(LogType.Database, message);
            },
            error(message) {
                Logger.err(LogType.Database, message);
            },
            deprecate(message) {
                Logger.notice(LogType.Database, message);
            },
            debug(message) {
                Logger.debug(LogType.Database, message);
            },
        },
    };

    private db: knex;
    private isInit: boolean = false;

    public async initDatabase(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            Logger.info(LogType.Database, "Creating database tables");
            await this.createUserLevelTable();
            await this.createVIPLevelTable();
            await this.createUserTable();
            await this.createDonationsTable();
            await this.createTextCommandsTable();
            await this.populateDatabase();
            this.isInit = true;
            Logger.info(LogType.Database, "Database init finished.");
            resolve();
        });
    }

    private async hasTable(tableName: string): Promise<boolean> {
        return this.db.schema.hasTable(tableName);
    }

    private async createUserLevelTable(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const hasUserLevelTable = await this.hasTable(DatabaseTables.UserLevels);
            if (!hasUserLevelTable) {
                Logger.info(LogType.Database, `${DatabaseTables.UserLevels} being created.`);
                await this.db.schema.createTable(DatabaseTables.UserLevels, (table) => {
                    table.increments("id").primary().notNullable();
                    table.string("name").notNullable().unique();
                    table.integer("rank").notNullable();
                    Logger.info(LogType.Database, `${DatabaseTables.UserLevels} table created.`);
                    resolve();
                });
            } else {
                Logger.info(LogType.Database, `${DatabaseTables.UserLevels} already exists.`);
                resolve();
            }
        });
    }

    private async createVIPLevelTable(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const hasVIPLevelTable = await this.hasTable(DatabaseTables.VIPLevels);
            if (!hasVIPLevelTable) {
                Logger.info(LogType.Database, `${DatabaseTables.VIPLevels} being created.`);
                await this.db.schema.createTable(DatabaseTables.VIPLevels, (table) => {
                    table.increments("id").primary().notNullable();
                    table.string("name").notNullable().unique();
                    table.integer("rank").notNullable();
                    Logger.info(LogType.Database, `${DatabaseTables.VIPLevels} table created.`);
                    resolve();
                });
            } else {
                Logger.info(LogType.Database, `${DatabaseTables.VIPLevels} already exists.`);
                resolve();
            }
        });
    }

    private async createUserTable(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const hasUserTable = await this.hasTable(DatabaseTables.Users);
            if (!hasUserTable) {
                Logger.info(LogType.Database, `${DatabaseTables.Users} being created.`);
                await this.db.schema.createTable(DatabaseTables.Users, (table) => {
                    table.increments("id").primary().notNullable();
                    table.integer("vipLevelKey").unsigned();
                    table.foreign("vipLevelKey").references(`id`).inTable(DatabaseTables.VIPLevels);
                    table.integer("userLevelKey").unsigned();
                    table.foreign("userLevelKey").references(`id`).inTable(DatabaseTables.UserLevels);
                    table.string("username").notNullable().unique();
                    table.string("refreshToken").unique();
                    table.string("idToken").unique();
                    table.decimal("points").notNullable();
                    table.dateTime("vipExpiry");
                    table.boolean("hasLogin").notNullable();
                    table.string("streamlabsToken");
                    table.string("streamlabsRefresh");
                    Logger.info(LogType.Database, `${DatabaseTables.Users} table created.`);
                    resolve();
                });
            } else {
                Logger.info(LogType.Database, `${DatabaseTables.Users} already exists.`);
                resolve();
            }
        });
    }

    private async createTextCommandsTable(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const hasTextCommandsTable = await this.hasTable(DatabaseTables.TextCommands);
            if (!hasTextCommandsTable) {
                Logger.info(LogType.Database, `${DatabaseTables.TextCommands} being created.`);
                await this.db.schema.createTable(DatabaseTables.TextCommands, (table) => {
                    table.increments("id").primary().notNullable();
                    table.string("commandName").notNullable();
                    table.string("message").notNullable();
                    table.integer("minimumUserLevelKey").unsigned();
                    table.foreign("minimumUserLevelKey").references(`id`).inTable(DatabaseTables.UserLevels);
                    Logger.info(LogType.Database, `${DatabaseTables.TextCommands} table created.`);
                    resolve();
                });
            } else {
                Logger.info(LogType.Database, `${DatabaseTables.TextCommands} already exists.`);
                resolve();
            }
        });
    }

    private async createDonationsTable(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const hasDonationsTable = await this.hasTable(DatabaseTables.Donations);
            if (!hasDonationsTable) {
                Logger.info(LogType.Database, `${DatabaseTables.Donations} being created.`);
                await this.db.schema.createTable(DatabaseTables.Donations, (table) => {
                    table.increments("id").primary().notNullable();
                    table.string("username").notNullable();
                    table.dateTime("date").notNullable();
                    table.string("type").notNullable();
                    table.string("message");
                    table.decimal("amount").notNullable();
                    Logger.info(LogType.Database, `${DatabaseTables.Donations} table created.`);
                    resolve();
                });
            } else {
                Logger.info(LogType.Database, `${DatabaseTables.Donations} already exists.`);
                resolve();
            }
        });
    }

    private async populateDatabase(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const userLevelsAdded = await this.db(DatabaseTables.UserLevels).select();
            if (userLevelsAdded.length === 0) {
                const userLevels = [
                    { name: "Viewer", rank: 1 },
                    { name: "Subscriber", rank: 2 },
                    { name: "Moderator", rank: 3 },
                    { name: "Bot", rank: 4 },
                    { name: "Broadcaster", rank: 5 },
                ];
                await this.db(DatabaseTables.UserLevels).insert(userLevels);
                Logger.info(LogType.Database, `${DatabaseTables.UserLevels} populated with initial data.`);
            } else {
                Logger.info(LogType.Database, `${DatabaseTables.UserLevels} already has data.`);
            }
            const vipLevelsAdded = await this.db(DatabaseTables.VIPLevels).select();
            if (vipLevelsAdded.length === 0) {
                const vipLevels = [
                    { name: "None", rank: 1 },
                    { name: "Bronze", rank: 2 },
                    { name: "Silver", rank: 3 },
                    { name: "Gold", rank: 4 },
                ];
                await this.db(DatabaseTables.VIPLevels).insert(vipLevels);
                Logger.info(LogType.Database, `${DatabaseTables.VIPLevels} populated with initial data.`);
            } else {
                Logger.info(LogType.Database, `${DatabaseTables.VIPLevels} already has data.`);
            }
            resolve();
        });
    }

    public isInitialized(): boolean {
        return this.isInit;
    }

    public getQueryBuilder(tableName: string): knex.QueryBuilder {
        return this.db(tableName);
    }
}

export default DatabaseService;
