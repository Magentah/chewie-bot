import { injectable } from "inversify";
import * as knex from "knex";
import * as Config from "../config.json";
import { Logger, LogType } from "../logger";
import { IBotSettings, IUser } from "../models";

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
    Songlist = "songlist",
    TwitchUserProfile = "twitchUserProfile",
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
            warn(message: any) {
                Logger.warn(LogType.Database, "knex.warn", message);
            },
            error(message: any) {
                Logger.err(LogType.Database, "knex.err", message);
            },
            deprecate(message: any) {
                Logger.notice(LogType.Database, "knex.deprecated", message);
            },
            debug(message: any) {
                Logger.debug(LogType.Database, `knex.debug -- ${message.sql}`, message);
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
                await this.createSonglistTable();
                await this.populateDatabase();
                await this.addBroadcaster();
                await this.addDefaultBotSettings();
                await this.createTwitchProfileTable();
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

    /**
     * Helper function to create a table.
     * @param tableName Name of the table to create
     * @param callback Callback function called to create the table.
     */
    private async createTable(tableName: DatabaseTables, callback: (table: knex.TableBuilder) => any): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const hasTable = await this.hasTable(tableName);
            if (!hasTable) {
                Logger.debug(LogType.Database, `${tableName} being created.`);
                await this.db.schema.createTable(tableName, callback);
                resolve();
            } else {
                Logger.debug(LogType.Database, `${tableName} already exists.`);
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
            table.string("username").notNullable();
            table.string("refreshToken").unique();
            table.string("accessToken").unique();
            table.string("idToken").unique();
            table.decimal("points").notNullable();
            table.dateTime("vipExpiry");
            table.boolean("hasLogin").notNullable();
            table.string("streamlabsToken");
            table.string("streamlabsRefresh");
            table.string("spotifyRefresh");
            table.integer("twitchProfileKey").unsigned();
            table.foreign("twitchProfileKey").references("id").inTable(DatabaseTables.TwitchUserProfile);
        });
    }

    private async createTwitchProfileTable(): Promise<void> {
        return this.createTable(DatabaseTables.TwitchUserProfile, (table) => {
            table.integer("id").primary().notNullable().unique();
            table.string("username").notNullable();
            table.string("displayName").notNullable();
            table.string("profileImageUrl");
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

    private async createSonglistTable(): Promise<void> {
        return this.createTable(DatabaseTables.Songlist, (table) => {
            table.increments("id").primary().notNullable();
            table.string("album").notNullable();
            table.string("title").notNullable();
            table.string("genre").notNullable();
            table.dateTime("created").notNullable();
        });
    }

    /**
     * Adds user and vip levels to the database if they don't exist.
     */
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
                Logger.debug(LogType.Database, `${DatabaseTables.UserLevels} populated with initial data.`);
            } else {
                Logger.debug(LogType.Database, `${DatabaseTables.UserLevels} already has data.`);
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
                Logger.debug(LogType.Database, `${DatabaseTables.VIPLevels} populated with initial data.`);
            } else {
                Logger.debug(LogType.Database, `${DatabaseTables.VIPLevels} already has data.`);
            }
            resolve();
        });
    }

    /**
     * Adds config.json configured broadcaster as a user with broadcaster status to the database if it exists.
     */
    private async addBroadcaster(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const broadcasterUsername = Config.twitch.broadcasterName;
            if (!(await this.db(DatabaseTables.Users).first().where("username", "like", broadcasterUsername))) {
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

    /**
     * Adds bot settings for config.json to the database if they exist.
     */
    private async addDefaultBotSettings(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            if (
                Config.twitch.username &&
                Config.twitch.username.length > 0 &&
                Config.twitch.oauth &&
                Config.twitch.oauth.length > 0
            ) {
                if (!(await this.db(DatabaseTables.BotSettings).first().where("username", Config.twitch.username))) {
                    const botSettings: IBotSettings = {
                        username: Config.twitch.username,
                        oauth: Config.twitch.oauth,
                    };
                    await this.db(DatabaseTables.BotSettings).insert(botSettings);
                }
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
