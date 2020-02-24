import config = require('./../config.json');
import { Logger, LogType } from '../logger';
import { injectable } from 'inversify';
import * as knex from 'knex';
import { response } from 'express';

export enum Tables {
    Users = 'users',
    UserLevels = 'userLevels',
    TextCommands = 'textCommands',
    Quotes = 'quotes',
    Donations = 'donations',
    DonationTypes = 'donationTypes',
    VIPLevels = 'vipLevels',
}

export type DatabaseProvider = () => Promise<DatabaseService>;

@injectable()
export class DatabaseService {
    private readonly UNDEFINED_DATABASE = 'Database has not been initialized.';

    private dbConfig: knex.Config = {
        client: 'sqlite',
        connection: {
            filename: config.database.path,
        },
        debug: true,
        migrations: {
            tableName: 'migrations',
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

    private db: knex = knex(this.dbConfig);
    private isInit: boolean = false;

    public async initDatabase(): Promise<void> {
        if (!this.isInitialized()) {
            await this.createUserLevelTable();
            await this.createVIPLevelTable();
            await this.createUserTable()
            await this.createDonationsTable();
            await this.createTextCommandsTable();
            await this.populateDatabase();
            this.isInit = true;
        }
    }

    private async hasTable(tableName: string): Promise<boolean> {
        return this.db.schema.hasTable(tableName);
    }

    private async createUserLevelTable(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            try {
                const hasUserLevelTable = await this.hasTable(Tables.UserLevels);
                if (!hasUserLevelTable) {
                    Logger.info(LogType.Database, `${Tables.UserLevels} being created.`);
                    await this.db.schema.createTable(Tables.UserLevels, (table) => {
                        table.increments('id').primary().notNullable();
                        table.string('name').notNullable().unique();
                        table.integer('rank').notNullable();
                        Logger.info(LogType.Database, `${Tables.UserLevels} table created.`);
                        resolve();
                    });
                } else {
                    resolve();
                }
            } catch (e) {
                Logger.err(LogType.Database, `[creatUserLevelTable] ERR: ${e.message} `);
                reject(e);
            }

        });
    }

    private async createVIPLevelTable(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            try {
                const hasVIPLevelTable = await this.hasTable(Tables.VIPLevels);
                if (!hasVIPLevelTable) {
                    Logger.info(LogType.Database, `${Tables.VIPLevels} being created.`);
                    await this.db.schema.createTable(Tables.VIPLevels, (table) => {
                        table.increments('id').primary().notNullable();
                        table.string('name').notNullable().unique();
                        table.integer('rank').notNullable();
                        Logger.info(LogType.Database, `${Tables.VIPLevels} table created.`);
                        resolve();
                    });
                } else {
                    resolve();
                }
            } catch (e) {
                Logger.err(LogType.Database, `[createVIPLevelTable] ERR: ${e.message}`);
                reject(e);
            }
        });
    }

    private async createUserTable(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const hasUserTable = await this.hasTable(Tables.Users);
            if (!hasUserTable) {
                Logger.info(LogType.Database, `${Tables.Users} being created.`);
                await this.db.schema.createTable(Tables.Users, (table) => {
                    table.increments('id').primary().notNullable();
                    table.integer('vipLevelKey').unsigned();
                    table.foreign('vipLevelKey').references(`${Tables.VIPLevels}.id`);
                    table.integer('userLevelKey').unsigned();
                    table.foreign('userLevelKey').references(`${Tables.UserLevels}.id`);
                    table.string('username').notNullable().unique();
                    table.string('refreshToken').unique();
                    table.string('idToken').unique();
                    table.decimal('points').notNullable();
                    table.dateTime('vipExpiry');
                    table.boolean('hasLogin').notNullable();
                    Logger.info(LogType.Database, `${Tables.Users} table created.`);
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    private async createTextCommandsTable(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const hasTextCommandsTable = await this.hasTable(Tables.TextCommands);
            if (!hasTextCommandsTable) {
                Logger.info(LogType.Database, `${Tables.TextCommands} being created.`);
                await this.db.schema.createTable(Tables.TextCommands, (table) => {
                    table.increments('id').primary().notNullable();
                    table.string('commandName').notNullable();
                    table.string('message').notNullable();
                    table.integer('minimumUserLevelKey').unsigned();
                    table.foreign('minimumUserLevelKey').references(`${Tables.UserLevels}.id`);
                    Logger.info(LogType.Database, `${Tables.TextCommands} table created.`);
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    private async createDonationsTable(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const hasDonationsTable = await this.hasTable(Tables.Donations);
            if (!hasDonationsTable) {
                Logger.info(LogType.Database, `${Tables.Donations} being created.`);
                await this.db.schema.createTable(Tables.Donations, (table) => {
                    table.increments('id').primary().notNullable();
                    table.string('username').notNullable();
                    table.dateTime('date').notNullable();
                    table.string('type').notNullable();
                    table.string('message');
                    table.decimal('amount').notNullable();
                    Logger.info(LogType.Database, `${Tables.Donations} table created.`);
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    private async populateDatabase(): Promise<void> {
        console.log("populateDatabase");
        return new Promise<void>(async (resolve, reject) => {
            const userLevelsAdded = await this.db(Tables.UserLevels).select();
            try {
                if (userLevelsAdded.length === 0) {
                    const userLevels = [
                        { name: 'Viewer', rank: 1 },
                        { name: 'Subscriber', rank: 2 },
                        { name: 'Moderator', rank: 3 },
                        { name: 'Bot', rank: 4 },
                        { name: 'Broadcaster', rank: 5 },
                    ];
                    await this.db(Tables.UserLevels).insert(userLevels);
                    Logger.info(LogType.Database, `${Tables.UserLevels} populated with initial data.`);
                }
                const vipLevelsAdded = await this.db(Tables.VIPLevels).select();
                if (vipLevelsAdded.length === 0) {
                    const vipLevels = [
                        { name: 'None', rank: 1 },
                        { name: 'Bronze', rank: 2 },
                        { name: 'Silver', rank: 3 },
                        { name: 'Gold', rank: 4 },
                    ];
                    await this.db(Tables.VIPLevels).insert(vipLevels);
                    Logger.info(LogType.Database, `${Tables.VIPLevels} populated with initial data.`);
                }
                return resolve();
            } catch (e){
                return reject(e);
            }
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
