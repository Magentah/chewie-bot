import * as Winston from 'winston';
const { combine, timestamp, label, prettyPrint } = Winston.format;
import config = require('./config.json');

export enum LogType {
    Command = 'Command',
    Twitch = 'Twitch',
    ServerInfo = 'ServerInfo',
    Cache = 'Cache',
    Database = 'Database',
    OAuth = 'OAuth',
    Youtube = 'Youtube',
    Server = 'Server',
}

enum LogLevel {
    Emergency = 'emerg',
    Alert = 'alert',
    Critical = 'crit',
    Error = 'error',
    Warning = 'warning',
    Notice = 'notice',
    Info = 'info',
    Debug = 'debug',
}

export class Logger {
    private static logger: Map<LogType, Winston.Logger>;

    public static init() {
        this.logger = new Map<LogType, Winston.Logger>();
        this.setupLoggers();
    }

    /**
     * Check whether a LogType is enabled for logging.
     * @param type LogType to check
     */
    private static logTypeEnabled(type: LogType): boolean {
        const lowerCaseType = type.toLowerCase();
        if (this.isEnabledLogKey(config.log.enabledLogs, lowerCaseType)) {
            return config.log.enabledLogs[lowerCaseType];
        } else {
            return false;
        }
    }

    /**
     * Type guarding to get a property from an imported .json file
     * @param obj Imported json object
     * @param key Key to get from the json object
     */
    private static isEnabledLogKey<T extends object>(obj: T, key: keyof any): key is keyof T {
        return key in obj;
    }

    /**
     * Logs a message
     * @param type The LogType of the log - used to filter logs by type. Types can be enabled or disabled in config.json
     * @param level The log severity.
     * @param message Message to log. Can also be an Error object.
     */
    private static log(type: LogType, level: LogLevel, message: string | Error) {
        if (this.logger.has(type) && this.logTypeEnabled(type)) {
            const logger = this.logger.get(type) as Winston.Logger;
            if (typeof message === 'string' || message instanceof String) {
                logger.log(level, message as string, type);
            } else {
                const err = message as Error;
                logger.log(level, err.message, { type, name: err.name, stack: err.stack });
            }
        }
    }

    public static emerg(type: LogType, message: string | Error) {
        this.log(type, LogLevel.Emergency, message);
    }

    public static alert(type: LogType, message: string | Error) {
        this.log(type, LogLevel.Alert, message);
    }

    public static critical(type: LogType, message: string | Error) {
        this.log(type, LogLevel.Critical, message);
    }

    public static err(type: LogType, message: string | Error) {
        this.log(type, LogLevel.Error, message);
    }

    public static warn(type: LogType, message: string | Error) {
        this.log(type, LogLevel.Warning, message);
    }

    public static notice(type: LogType, message: string | Error) {
        this.log(type, LogLevel.Notice, message);
    }

    public static info(type: LogType, message: string | Error) {
        this.log(type, LogLevel.Info, message);
    }

    public static debug(type: LogType, message: string | Error) {
        this.log(type, LogLevel.Debug, message);
    }

    /**
     * Iterate through all keys in LogType and setup a separate logger for each type.
     * Used to separate logs based on type.
     */
    private static setupLoggers() {
        Object.keys(LogType).forEach((val) => {
            this.logger.set(val as LogType, this.setupCommandLogger(val as LogType));
        });
    }

    private static setupCommandLogger(type: LogType): Winston.Logger {
        const options = this.getLogOptions(type);
        const logger = Winston.createLogger(options);
        return logger;
    }

    private static getLogOptions(type: LogType): Winston.LoggerOptions {
        let options: Winston.LoggerOptions = {
            level: config.log.level,
        };

        options = this.setLogLevels(options);
        options = this.setLogFormat(options, type);
        options = this.setLogTransports(options, type);

        return options;
    }

    private static setLogLevels(options: Winston.LoggerOptions): Winston.LoggerOptions {
        if (!config.log.levels || config.log.levels === 'syslog') {
            options.levels = Winston.config.syslog.levels;
        } else if (config.log.levels === 'npm') {
            options.levels = Winston.config.npm.levels;
        }
        return options;
    }

    private static setLogFormat(options: Winston.LoggerOptions, type: LogType): Winston.LoggerOptions {
        options.format = combine(
            label({ label: type }),
            timestamp(),
            prettyPrint({ colorize: true }),
        );

        return options;
    }

    private static setLogTransports(options: Winston.LoggerOptions, type: LogType): Winston.LoggerOptions {
        // Different format for files as colorize adds unicode characters
        const fileFormat = combine(
            label({ label: type }),
            timestamp(),
            prettyPrint({ colorize: false }),
        );

        options.transports = [
            new Winston.transports.Console({
                handleExceptions: true,
            }),
            new Winston.transports.File({
                filename: 'errors.log',
                level: 'error',
                format: fileFormat,
            }),
        ];

        return options;
    }
}

export default Logger;
