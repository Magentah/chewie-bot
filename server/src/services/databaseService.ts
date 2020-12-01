import { injectable } from "inversify";
import * as knex from "knex";
import * as Config from "../config.json";
import { Logger, LogType } from "../logger";
import { IUser } from "../models";

export enum DatabaseTables {
    Users = "users",
    UserLevels = "userLevels",
    TextCommands = "textCommands",
    Quotes = "quotes",
    Donations = "donations",
    DonationTypes = "donationTypes",
    VIPLevels = "vipLevels",
    CommandAliases = "commandAliases",
    BotSettings = "botSettings",
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
    private inSetup: boolean = false;

    public async initDatabase(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            if (!this.isInit && !this.inSetup) {
                this.inSetup = true;
                Logger.info(LogType.Database, "Creating database tables");
                await this.createUserLevelTable();
                await this.createVIPLevelTable();
                await this.createUserTable();
                await this.createDonationsTable();
                await this.createTextCommandsTable();
                await this.createCommandAliasTable();
                await this.createBotSettingsTable();
                await this.populateDatabase();
                await this.addBroadcaster();
                Logger.info(LogType.Database, "Database init finished.");
                this.inSetup = false;
                this.isInit = true;
            }
            resolve();
        });
    }

    private async hasTable(tableName: string): Promise<boolean> {
        return this.db.schema.hasTable(tableName);
    }

    private async createTable(tableName: DatabaseTables, callback: (table: knex.TableBuilder) => any): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const hasTable = await this.hasTable(tableName);
            if (!hasTable) {
                Logger.info(LogType.Database, `${tableName} being created.`);
                await this.db.schema.createTable(tableName, callback);
                resolve();
            } else {
                Logger.info(LogType.Database, `${tableName} already exists.`);
                resolve();
            }
        });
    }

    private async createUserLevelTable(): Promise<void> {
        return this.createTable(DatabaseTables.UserLevels, (table) => {
            table.increments("id").primary().notNullable();
            table.string("name").notNullable().unique();
            table.integer("rank").notNullable();
        });
    }

    private async createVIPLevelTable(): Promise<void> {
        return this.createTable(DatabaseTables.VIPLevels, (table) => {
            table.increments("id").primary().notNullable();
            table.string("name").notNullable().unique();
            table.integer("rank").notNullable();
        });
    }

    private async createUserTable(): Promise<void> {
        return this.createTable(DatabaseTables.Users, (table) => {
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
        });
    }

    private async createTextCommandsTable(): Promise<void> {
        return this.createTable(DatabaseTables.TextCommands, (table) => {
            table.increments("id").primary().notNullable();
            table.string("commandName").notNullable();
            table.string("message").notNullable();
            table.integer("minimumUserLevelKey").unsigned();
            table.foreign("minimumUserLevelKey").references(`id`).inTable(DatabaseTables.UserLevels);
        });
    }

    private async createDonationsTable(): Promise<void> {
        return this.createTable(DatabaseTables.Donations, (table) => {
            table.increments("id").primary().notNullable();
            table.string("username").notNullable();
            table.dateTime("date").notNullable();
            table.string("type").notNullable();
            table.string("message");
            table.decimal("amount").notNullable();
        });
    }

    private async createCommandAliasTable(): Promise<void> {
        return this.createTable(DatabaseTables.CommandAliases, (table) => {
            table.increments("id").primary().notNullable();
            table.string("alias").unique().notNullable();
            table.string("commandName").notNullable();
            table.string("commandArguments");
        });
    }

    private async createBotSettingsTable(): Promise<void> {
        return this.createTable(DatabaseTables.BotSettings, (table) => {
            table.increments("id").primary().notNullable();
            table.string("username").unique().notNullable();
            table.string("oauth").notNullable();
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

    private async addBroadcaster(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const username: string = "";
            if (!(await this.db(DatabaseTables.Users).first().where("username", "like", username))) {
                const broadcasterUsername = Config.twitch.broadcasterName;
                const user: IUser = {
                    username: broadcasterUsername,
                    userLevelKey: 5,
                    vipLevelKey: 1,
                    points: 0,
                    hasLogin: true,
                };

                await this.db(DatabaseTables.Users).insert(user);
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
