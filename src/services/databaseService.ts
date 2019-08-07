import config = require('./../config.json');
import { Logger, LogType } from '../logger';
import { injectable } from 'inversify';
import * as knex from 'knex';
import { response } from 'express';

export enum Tables {
    Users = 'users',
    UserLevels = 'userLevels',
    ModLevels = 'modLevels',
    TextCommands = 'textCommands',
    Quotes = 'quotes',
    Donations = 'donations',
    DonationTypes = 'donationTypes',
}

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
        Logger.info(LogType.Database, 'Creating database tables');
        Logger.info(LogType.Database, `${Tables.UserLevels} being created.`);
        await this.createUserLevelTable();
        Logger.info(LogType.Database, `${Tables.ModLevels} being created.`);
        await this.createModLevelTable();
        Logger.info(LogType.Database, `${Tables.Users} being created.`);
        await this.createUserTable();
        Logger.info(LogType.Database, `${Tables.DonationTypes} being created.`);
        await this.createDonationTypesTable();
        Logger.info(LogType.Database, `${Tables.Donations} being created.`);
        await this.createDonationsTable();
        Logger.info(LogType.Database, `${Tables.TextCommands} being created.`);
        await this.createTextCommandsTable();
        this.isInit = true;
    }

    private async hasTable(tableName: string): Promise<boolean> {
        return this.db.schema.hasTable(tableName);
    }

    private async createUserLevelTable(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const hasUserLevelTable = await this.hasTable(Tables.UserLevels);
            if (!hasUserLevelTable) {
                await this.db.schema.createTable(Tables.UserLevels, (table) => {
                    table.increments('id').primary().notNullable();
                    table.string('name').notNullable().unique();
                    Logger.info(LogType.Database, `${Tables.UserLevels} table created.`);
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    private async createModLevelTable(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const hasModLevelTable = await this.hasTable(Tables.ModLevels);
            Logger.info(LogType.Database, `modlevel ${hasModLevelTable}`);
            if (!hasModLevelTable) {
                await this.db.schema.createTable(Tables.ModLevels, (table) => {
                    table.increments('id').primary().notNullable();
                    table.string('name').notNullable().unique();
                    Logger.info(LogType.Database, `${Tables.ModLevels} table created.`);
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    private async createUserTable(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const hasUserTable = await this.hasTable(Tables.Users);
            if (!hasUserTable) {
                await this.db.schema.createTable(Tables.Users, (table) => {
                    table.increments('id').primary().notNullable();
                    table.integer('modLevel').unsigned();
                    table.foreign('modLevel').references(`${Tables.ModLevels}.id`);
                    table.integer('userLevel').unsigned();
                    table.foreign('userLevel').references(`${Tables.UserLevels}.id`);
                    table.string('username').notNullable().unique();
                    table.string('refreshToken').notNullable().unique();
                    table.string('idToken').notNullable().unique();
                    table.decimal('points').notNullable();
                    table.dateTime('vipExpiry');
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
                await this.db.schema.createTable(Tables.TextCommands, (table) => {
                    table.increments('id').primary().notNullable();
                    table.string('message').notNullable();
                    table.boolean('modRequired').notNullable();
                    table.integer('minimumModLevel').unsigned();
                    table.foreign('minimumModLevel').references(`${Tables.ModLevels}.id`);
                    Logger.info(LogType.Database, `${Tables.TextCommands} table created.`);
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    private async createDonationTypesTable(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const hasDonationTypesTable = await this.hasTable(Tables.DonationTypes);
            if (!hasDonationTypesTable) {
                await this.db.schema.createTable(Tables.DonationTypes, (table) => {
                    table.increments('id').primary().notNullable();
                    table.string('name').notNullable().unique();
                    Logger.info(LogType.Database, `${Tables.DonationTypes} table created.`);
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

    public isInitialized(): boolean {
        return this.isInit;
    }

    public getQueryBuilder(tableName: string): knex.QueryBuilder {
        return this.db(tableName);
    }
}

export default DatabaseService;
