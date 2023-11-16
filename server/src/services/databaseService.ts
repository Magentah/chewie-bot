import { injectable } from "inversify";
import { Knex, knex } from "knex";
import moment = require("moment");
import * as Config from "../config.json";
import { Logger, LogType } from "../logger";
import { IUser, UserLevels } from "../models";
import { delay } from "../helpers/asyncHelper";
import { exec } from "child_process";

export enum DatabaseTables {
    Users = "users",
    UserAuth = "userAuthorization",
    TextCommands = "textCommands",
    TextGenerationCache = "textGenerationCache",
    Quotes = "quotes",
    Donations = "donations",
    DonationTypes = "donationTypes",
    VIPLevels = "vipLevels",
    CommandAliases = "commandAliases",
    BotSettings = "botSettings",
    Songlist = "songlist",
    SonglistCategories = "songlistCategories",
    SonglistTags = "songlistTags",
    SonglistSongTags = "songlistSongTags",
    SonglistFavorites = "songlistFavorites",
    TwitchUserProfile = "twitchUserProfile",
    DiscordSettings = "discordSettings",
    EventLogs = "eventLogs",
    PointLogs = "pointLogs",
    PointArchive = "pointArchive",
    Messages = "messages",
    Cards = "userCards",
    CardStack = "userCardStack",
    CardUpgrades = "userCardUpgrades",
    UserTaxStreak = "userTaxStreak",
    UserTaxHistory = "userTaxHistory",
    ChannelPointRewards = "channelPointRewards",
    ChannelPointRewardHistory = "channelPointRewardHistory",
    StreamActivity = "streamActivity",
    Achievements = "achievements",
    UserAchievements = "userAchievements",
    Seasons = "seasons",
    CommandRedemptions = "commandRedemptions",
}

export type DatabaseProvider = () => Promise<DatabaseService>;

// Already in types/knex/index.d.ts, but does not compile in docker container without having it duplicated here.
declare module "knex" {
  namespace Knex {
    interface QueryBuilder {
        fulltextSearch<TRecord, TResult>(value: string, columns: string[]): Knex.QueryBuilder<any, TResult>;
    }
  }
}

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

        // Searches within multiple columns for the given search subjects. Each
        // word in the search query must match at least one column (use more search
        // subjects to narrow down the search).
        knex.QueryBuilder.extend("fulltextSearch", function(value: string, columns: string[]) {
            if (!value || columns.length === 0) {
                return this;
            }

            let query = this;
            const words = value.split(" ");
            for (const word of words) {
                query = query.andWhere((b => {
                    for (const col of columns) {
                        b.orWhere(col, "LIKE", `%${word}%`);
                    }
                }));
            }

            return query;
        });
    }

    private dbConfig: Knex.Config = {
        client: Config.database.client,
        connection: {
            filename: Config.database.connection.name,
        },
        debug: true,
        migrations: {
            tableName: "migrations",
        },
        useNullAsDefault: true,
        pool: {
            afterCreate: (conn: any, cb: any) =>
                conn.run("PRAGMA foreign_keys = ON", cb)
        },
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

    private db: Knex;
    private isInit = false;
    private inSetup = false;
    private currentTransaction: Knex.Transaction<any, any[]> | undefined = undefined;

    public async initDatabase(): Promise<void> {
        if (!this.isInit && !this.inSetup) {
            this.inSetup = true;
            Logger.info(LogType.Database, "Creating database tables");
            await this.createVIPLevelTable();
            await this.createUserTable();
            await this.createAuthorizationTable();
            await this.createDonationsTable();
            await this.createTextCommandsTable();
            await this.createTextCommandsCacheTable();
            await this.createQuotesTable();
            await this.createCommandAliasTable();
            await this.createBotSettingsTable();
            await this.createSonglistTable();
            await this.createSonglistCategoriesTable();
            await this.createSonglistFavoritesTable();
            await this.createSonglistTagsTable();
            await this.createSonglistSongTagsTable();
            await this.createDiscordSettingTable();
            await this.createEventLogsTable();
            await this.createPointLogsTable();
            await this.createMessagesTable();
            await this.createTwitchProfileTable();
            await this.createUserCardsTable();
            await this.createUserCardStackTable();
            await this.createUserCardUpgradesTable();
            await this.createUserTaxStreakTable();
            await this.createUserTaxHistoryTable();
            await this.createChannelPointRewardsTable();
            await this.createChannelPointRewardHistoryTable();
            await this.createStreamActivityTable();
            await this.createAchievementsTable();
            await this.createUserAchievementsTable();
            await this.createSeasonsTable();
            await this.createPointArchiveTable();
            await this.createCommandRedemptionsTable();

            // Need to add VIP levels first because of foreign key.
            await this.populateDatabase();
            await this.addBroadcaster();
            Logger.info(LogType.Database, "Database init finished.");
            this.inSetup = false;
            this.isInit = true;
        } else if (this.isInit) {
            return;
        } else if (this.inSetup) {
            await this.waitForSetup();
        }
    }

    /**
     * Function that loops and resolves after no longer in setup stage.
     * @returns Promise that resolves when this.inSetup is false.
     */
    private async waitForSetup(): Promise<void> {
        while (this.inSetup) {
            await delay(100);
        }
    }

    private async hasTable(tableName: string): Promise<boolean> {
        return this.db.schema.hasTable(tableName);
    }

    /**
     * Helper function to create a table.
     * @param tableName Name of the table to create
     * @param callback Callback function called to create the table.
     */
    private async createTable(tableName: DatabaseTables, callback: (table: Knex.TableBuilder) => any): Promise<void> {
        const hasTable = await this.hasTable(tableName);
        if (!hasTable) {
            Logger.debug(LogType.Database, `${tableName} being created.`);
            await this.db.schema.createTable(tableName, callback);
        } else {
            Logger.debug(LogType.Database, `${tableName} already exists.`);
        }
    }
    private async createDiscordSettingTable(): Promise<void> {
        return this.createTable(DatabaseTables.DiscordSettings, (table) => {
            table.increments("id").primary().notNullable();
            table.string("name").notNullable().unique();
            table.string("value").notNullable();
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
            table.foreign("vipLevelKey").references("id").inTable(DatabaseTables.VIPLevels);
            table.integer("userLevel").unsigned().notNullable().defaultTo(UserLevels.Viewer);
            table.string("username").notNullable();
            table.decimal("points").notNullable();
            table.dateTime("vipExpiry");
            table.integer("vipPermanentRequests");
            table.dateTime("vipLastRequest");
            table.integer("twitchProfileKey").unsigned().index();
            table.foreign("twitchProfileKey").references("id").inTable(DatabaseTables.TwitchUserProfile);
            table.unique(this.raw("username COLLATE NOCASE"));
        });
    }

    private async createAuthorizationTable(): Promise<void> {
        return this.createTable(DatabaseTables.UserAuth, (table) => {
            table.increments("id").primary().notNullable();
            table.integer("userId").notNullable().references("id").inTable(DatabaseTables.Users).onDelete("CASCADE");
            table.string("refreshToken");
            table.string("accessToken");
            table.string("scope");
            table.string("type");
            table.unique(["userId", "type"]);
        });
    }

    private async createTwitchProfileTable(): Promise<void> {
        return this.createTable(DatabaseTables.TwitchUserProfile, (table) => {
            table.integer("id").primary().notNullable();
            table.string("username").notNullable().index();
            table.string("displayName").notNullable();
            table.string("profileImageUrl");
        });
    }

    private async createTextCommandsTable(): Promise<void> {
        return this.createTable(DatabaseTables.TextCommands, (table) => {
            table.increments("id").primary().notNullable();
            table.string("commandName").unique().notNullable();
            table.string("message").notNullable();
            table.integer("minimumUserLevel").unsigned();
            table.integer("useCount").unsigned().notNullable().defaultTo(0);
            table.boolean("useCooldown").notNullable().defaultTo(true);
            table.integer("messageType").unsigned().defaultTo(0);
        });
    }

    private async createTextCommandsCacheTable(): Promise<void> {
        return this.createTable(DatabaseTables.TextGenerationCache, (table) => {
            table.increments("id").primary().notNullable();
            table.string("commandId").references("id").inTable(DatabaseTables.TextCommands).onDelete("CASCADE");
            table.string("key").notNullable().index();
            table.string("result").notNullable();
            table.dateTime("time").notNullable().index();
        });
    }

    private async createQuotesTable(): Promise<void> {
        return this.createTable(DatabaseTables.Quotes, (table) => {
            table.increments("id").primary().notNullable();
            table.string("text").notNullable();
            table.string("author").notNullable();
            table.dateTime("dateAdded");
            table.string("addedByUserName").notNullable();
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
            table.string("key").unique().notNullable();
            table.string("value").notNullable();
        });
    }

    private async createSonglistTable(): Promise<void> {
        return this.createTable(DatabaseTables.Songlist, (table) => {
            table.increments("id").primary().notNullable();
            table.string("album").notNullable();
            table.string("title").notNullable();
            table.string("artist").notNullable().defaultTo("");
            table.integer("categoryId").notNullable().references("id").inTable(DatabaseTables.SonglistCategories);
            table.dateTime("created").notNullable();
            table.integer("attributedUserId").references("id").inTable(DatabaseTables.Users);
        });
    }

    private async createSonglistCategoriesTable(): Promise<void> {
        return this.createTable(DatabaseTables.SonglistCategories, (table) => {
            table.increments("id").primary().notNullable();
            table.string("name").notNullable().unique();
            table.integer("sortOrder").notNullable();
        });
    }

    private async createSonglistFavoritesTable(): Promise<void> {
        return this.createTable(DatabaseTables.SonglistFavorites, (table) => {
            table.increments("id").primary().notNullable();
            table.integer("userId").notNullable().references("id").inTable(DatabaseTables.Users).onDelete("CASCADE");
            table.integer("songId").notNullable().references("id").inTable(DatabaseTables.Songlist).onDelete("CASCADE");
            table.unique(["userId", "songId"]);
        });
    }

    private async createSonglistTagsTable(): Promise<void> {
        return this.createTable(DatabaseTables.SonglistTags, (table) => {
            table.increments("id").primary().notNullable();
            table.string("name").notNullable().unique();
        });
    }

    private async createSonglistSongTagsTable(): Promise<void> {
        return this.createTable(DatabaseTables.SonglistSongTags, (table) => {
            table.increments("id").primary().notNullable();
            table.integer("tagId").notNullable().references("id").inTable(DatabaseTables.SonglistTags).onDelete("CASCADE");
            table.integer("songId").notNullable().references("id").inTable(DatabaseTables.Songlist).onDelete("CASCADE");
            table.unique(["tagId", "songId"]);
        });
    }

    private async createEventLogsTable(): Promise<void> {
        return this.createTable(DatabaseTables.EventLogs, (table) => {
            table.increments("id").primary().notNullable();
            table.string("type").notNullable();
            table.string("username").notNullable();
            table.integer("userId").references("id").inTable(DatabaseTables.Users).index();
            table.json("data").notNullable();
            table.dateTime("time").notNullable().index();
        });
    }

    private async createPointLogsTable(): Promise<void> {
        return this.createTable(DatabaseTables.PointLogs, (table) => {
            table.increments("id").primary().notNullable();
            table.string("eventType").notNullable();
            table.integer("userId").notNullable().references("id").inTable(DatabaseTables.Users).index();
            table.string("username").notNullable();
            table.integer("pointsBefore").notNullable();
            table.integer("points").notNullable();
            table.dateTime("time").notNullable().index();
            table.string("reason").nullable();
        });
    }

    private async createMessagesTable(): Promise<void> {
        return this.createTable(DatabaseTables.Messages, (table) => {
            table.increments("id").primary().notNullable();
            table.string("type").notNullable();
            table.string("text").notNullable();
            table.string("eventType").notNullable();
        });
    }

    private async createUserCardsTable(): Promise<void> {
        return this.createTable(DatabaseTables.Cards, (table) => {
            table.integer("id").primary().notNullable();
            table.string("name").unique().notNullable();
            table.string("imageId").notNullable();
            table.string("mimetype");
            table.string("setName");
            table.string("baseCardName");
            table.integer("rarity").notNullable();
            table.boolean("isUpgrade").defaultTo(false).notNullable();
            table.boolean("isEnabled").defaultTo(true).notNullable();
            table.dateTime("creationDate").notNullable();
        });
    }

    private async createUserCardStackTable(): Promise<void> {
        return this.createTable(DatabaseTables.CardStack, (table) => {
            table.integer("id").primary().notNullable();
            table.integer("userId").notNullable().index();
            table.foreign("userId").references("id").inTable(DatabaseTables.Users).onDelete("CASCADE");
            table.integer("cardId").notNullable().index();
            table.foreign("cardId").references("id").inTable(DatabaseTables.Cards).onDelete("CASCADE");
            table.dateTime("redemptionDate").notNullable();
            table.boolean("deleted").notNullable().defaultTo(false);
        });
    }

    private async createUserCardUpgradesTable(): Promise<void> {
        return this.createTable(DatabaseTables.CardUpgrades, (table) => {
            table.integer("id").primary().notNullable();
            table.integer("userId").notNullable();
            table.foreign("userId").references("id").inTable(DatabaseTables.Users).onDelete("CASCADE");
            table.integer("upgradedCardId").notNullable();
            table.foreign("upgradedCardId").references("id").inTable(DatabaseTables.Cards).onDelete("CASCADE");
            table.integer("upgradeCardId").notNullable();
            table.foreign("upgradeCardId").references("id").inTable(DatabaseTables.Cards).onDelete("CASCADE");
            table.dateTime("dateUpgraded").notNullable();
            table.unique(["userId", "upgradedCardId", "upgradeCardId"]);
        });
    }

    private async createUserTaxStreakTable(): Promise<void> {
        return this.createTable(DatabaseTables.UserTaxStreak, (table) => {
            table.increments("id").primary().notNullable();
            table.integer("userId").notNullable().unique();
            table.foreign("userId").references("id").inTable(DatabaseTables.Users).onDelete("CASCADE");
            table.integer("currentStreak").notNullable();
            table.integer("longestStreak").notNullable();
            table.integer("lastTaxRedemptionId").notNullable();
            table.foreign("lastTaxRedemptionId").references("id").inTable(DatabaseTables.UserTaxHistory);
        });
    }

    private async createUserTaxHistoryTable(): Promise<void> {
        return this.createTable(DatabaseTables.UserTaxHistory, (table) => {
            table.increments("id").primary().notNullable();
            table.integer("userId").notNullable().index();
            table.integer("type").notNullable();
            table.foreign("userId").references("id").inTable(DatabaseTables.Users).onDelete("CASCADE");
            table.dateTime("taxRedemptionDate").notNullable().index();
            table.string("channelPointRewardTwitchId");
        });
    }

    private async createChannelPointRewardsTable(): Promise<void> {
        return this.createTable(DatabaseTables.ChannelPointRewards, (table) => {
            table.increments("id").primary().notNullable();
            table.string("twitchRewardId").notNullable().unique();
            table.string("title").notNullable();
            table.integer("cost").notNullable();
            table.boolean("isEnabled").notNullable().defaultTo(true);
            table.boolean("isGlobalCooldownEnabled").notNullable().defaultTo(false);
            table.integer("globalCooldown");
            table.boolean("shouldSkipRequestQueue").notNullable().defaultTo(false);
            table.string("associatedRedemption");
            table.string("arguments");
            table.boolean("isDeleted").notNullable().defaultTo(false);
            table.boolean("hasOwnership").notNullable().defaultTo(false);
        });
    }

    private async createChannelPointRewardHistoryTable(): Promise<void> {
        return this.createTable(DatabaseTables.ChannelPointRewardHistory, (table) => {
            table.increments("id").primary().notNullable();
            table.integer("userId").notNullable().index();
            table.foreign("userId").references("id").inTable(DatabaseTables.Users).onDelete("CASCADE");
            table.string("rewardId").notNullable();
            table.string("associatedRedemption").notNullable();
            table.dateTime("dateTimeTriggered").notNullable();
        });
    }

    private async createStreamActivityTable(): Promise<void> {
        return this.createTable(DatabaseTables.StreamActivity, (table) => {
            table.increments("id").primary().notNullable();
            table.string("event").notNullable();
            table.dateTime("dateTimeTriggered").notNullable().index();
            table.boolean("assumeInvalid").defaultTo(false);
        });
    }

    private async createAchievementsTable(): Promise<void> {
        return this.createTable(DatabaseTables.Achievements, (table) => {
            table.increments("id").primary().notNullable();
            table.integer("type").notNullable();
            table.integer("amount").notNullable();
            table.integer("pointRedemption").notNullable().defaultTo(0);
            table.integer("name").notNullable();
            table.boolean("seasonal").notNullable().defaultTo(false);
            table.string("imageId").notNullable();
            table.string("mimetype");
            table.string("announcementMessage");
            table.dateTime("creationDate").notNullable();
        });
    }

    private async createUserAchievementsTable(): Promise<void> {
        return this.createTable(DatabaseTables.UserAchievements, (table) => {
            table.increments("id").primary().notNullable();
            table.integer("userId").notNullable().references("id").inTable(DatabaseTables.Users);
            table.integer("achievementId").notNullable().references("id").inTable(DatabaseTables.Achievements).onDelete("CASCADE").index();
            table.dateTime("date").notNullable();
            table.dateTime("expiredDate");
            table.integer("seasonId").references("id").inTable(DatabaseTables.Seasons);
            table.dateTime("redemptionDate");
            // Achievements can only be granted once, unless seasonal, then they need to have different
            // expiration dates for each season.
            table.unique(["userId", "achievementId", "expiredDate"]);
        });
    }

    private async createSeasonsTable(): Promise<void> {
        return this.createTable(DatabaseTables.Seasons, (table) => {
            table.increments("id").primary().notNullable();
            table.dateTime("startDate");
            table.dateTime("endDate");
            table.string("plannedEndDate");
        });
    }

    private async createPointArchiveTable(): Promise<void> {
        return this.createTable(DatabaseTables.PointArchive, (table) => {
            table.increments("id").primary().notNullable();
            table.integer("seasonId").notNullable().references("id").inTable(DatabaseTables.Seasons).onDelete("CASCADE");
            table.integer("userId").notNullable().references("id").inTable(DatabaseTables.Users).onDelete("CASCADE");
            table.decimal("points").notNullable();
            table.unique(["userId", "seasonId"]);
        });
    }

    private async createCommandRedemptionsTable(): Promise<void> {
        return this.createTable(DatabaseTables.CommandRedemptions, (table) => {
            table.increments("id").primary().notNullable();
            table.string("name").notNullable().unique();
            table.string("message");
            table.string("imageId").notNullable();
            table.string("mimetype");
        });
    }

    /**
     * Adds user and vip levels to the database if they don't exist.
     */
    private async populateDatabase(): Promise<void> {
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
    }

    /**
     * Adds config.json configured broadcaster as a user with broadcaster status to the database if it exists.
     */
    private async addBroadcaster(): Promise<void> {
        const broadcasterUsername = Config.twitch.broadcasterName;
        if (!(await this.db(DatabaseTables.Users).first().where("username", "like", broadcasterUsername))) {
            const user: IUser = {
                username: broadcasterUsername,
                userLevel: UserLevels.Broadcaster,
                vipLevelKey: 1,
                points: 0
            };

            await this.db(DatabaseTables.Users).insert(user);
        }
    }

    public isInitialized(): boolean {
        return this.isInit;
    }

    public transaction<T>(transactionScope: (trx: Knex.Transaction) => Promise<T> | void) : Promise<T> {
        return this.db.transaction(transactionScope);
    }

    public useTransaction(trx: Knex.Transaction<any, any[]> | undefined) {
        this.currentTransaction = trx;
    }

    public getQueryBuilder(tableName: string): Knex.QueryBuilder {
        if (this.currentTransaction) {
            return this.db(tableName).transacting(this.currentTransaction);
        }

        return this.db(tableName);
    }

    public raw(value: string): any {
        return this.db.raw(value);
    }

    public async createBackup(callback?: (error: any, stderr: any, stdout: any) => Promise<void>): Promise<string | undefined> {
        return new Promise<string | undefined>((resolve, reject) => {
            Logger.info(LogType.Backup, "Backing up database.");
            if (Config.database.client === "sqlite3") {
                const now = moment();
                const filename = `${now.format("YYYY-MM-DD-HH-mm-ss")}.chewiedb.backup.gz`;
                exec("mkdir db/backups");
                exec(`sqlite3 ${Config.database.connection.name} .dump | gzip > 'db/backups/${filename}'`, (err: any, stderr: any, stdout: any) => {
                    if (callback) {
                        void callback(err, stderr, stdout);
                    }
                    resolve(filename);
                });
            } else {
                resolve(undefined);
            }
        });
    }
}

export default DatabaseService;
