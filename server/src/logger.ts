import * as Winston from "winston";
import winston = require("winston/lib/winston/config");
import "winston-daily-rotate-file";
import * as Config from "./config.json";

const { combine, timestamp, label, prettyPrint, printf, colorize } = Winston.format;

enum LogType {
    Server = "Server",
    ServerInfo = "ServerInfo",
    Command = "Command",
    Twitch = "Twitch",
    TwitchEvents = "TwitchEvents",
    TwitchPubSub = "TwitchPubSub",
    Cache = "Cache",
    Database = "Database",
    OAuth = "OAuth",
    Youtube = "Youtube",
    Song = "Song",
    WebSocket = "WebSocket",
    Language = "Lang",
    Spotify = "Spotify",
    Http = "Http",
    Streamlabs = "Streamlabs",
    Backup = "Backup",
    Cards = "Cards",
    Achievements = "Achievements",
}

enum LogLevel {
    Emergency = "emerg",
    Alert = "alert",
    Critical = "crit",
    Error = "error",
    Warning = "warning",
    Notice = "notice",
    Info = "info",
    Debug = "debug",
}

interface ILog {
    type: LogType;
    level: LogLevel;
    message: string | Error;
    obj?: object;
}

export class Logger {
    private static logger: Map<LogType, Winston.Logger>;
    private static logQueue: ILog[] = new Array<ILog>();

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
        if (this.isEnabledLogKey(Config.log.enabledLogs, lowerCaseType)) {
            return Config.log.enabledLogs[lowerCaseType];
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
     * Add a log message to the queue to be logged when possible.
     * Will attempt to log messages every 500ms until the logger has initialized.
     * Used due to some logs are that are attempted to be written before the logger has initialized.
     *
     * @param log The log to be added to the queue.
     */
    private static queueLog(log: ILog): void {
        // Add log to a queue that will attempt to rewrite the log when the logger has initialized.
        this.logQueue.push(log);
        setTimeout(() => {
            this.logQueue.forEach((logMessage, index, array) => {
                array.splice(index, 1);
                this.log(logMessage.type, logMessage.level, logMessage.message);
            });
        }, 500);
    }

    /**
     * Logs a message
     * @param type The LogType of the log - used to filter logs by type. Types can be enabled or disabled in config.json
     * @param level The log severity.
     * @param message Message to log. Can also be an Error object.
     */
    private static log(type: LogType, level: LogLevel, message: string | Error, obj?: object) {
        if (this.logger !== undefined) {
            if (this.logger.has(type) && this.logTypeEnabled(type)) {
                const logger = this.logger.get(type) as Winston.Logger;
                if (typeof message === "string" || message instanceof String) {
                    logger.log(level, message as string, { type, meta: { ...obj } });
                } else {
                    const err = message as Error;
                    logger.log(level, err.message, {
                        type,
                        name: err.name,
                        stack: err.stack,
                        meta: { ...obj },
                    });
                }
            }
        } else {
            this.queueLog({ type, level, message, obj });
        }
    }

    public static emerg(type: LogType, message: string | Error, obj?: object) {
        this.log(type, LogLevel.Emergency, message, obj);
    }

    public static alert(type: LogType, message: string | Error, obj?: object) {
        this.log(type, LogLevel.Alert, message, obj);
    }

    public static critical(type: LogType, message: string | Error, obj?: object) {
        this.log(type, LogLevel.Critical, message, obj);
    }

    public static err(type: LogType, message: string | Error, obj?: object) {
        this.log(type, LogLevel.Error, message, obj);
    }

    public static warn(type: LogType, message: string | Error, obj?: object) {
        this.log(type, LogLevel.Warning, message, obj);
    }

    public static notice(type: LogType, message: string | Error, obj?: object) {
        this.log(type, LogLevel.Notice, message, obj);
    }

    public static info(type: LogType, message: string | Error, obj?: object) {
        this.log(type, LogLevel.Info, message, obj);
    }

    public static debug(type: LogType, message: string | Error, obj?: object) {
        this.log(type, LogLevel.Debug, message, obj);
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
            level: Config.log.level,
        };

        options = this.setLogLevels(options);
        options = this.setLogFormat(options, type);
        options = this.setLogTransports(options, type);

        return options;
    }

    private static setLogLevels(options: Winston.LoggerOptions): Winston.LoggerOptions {
        if (!Config.log.levels || Config.log.levels === "syslog") {
            options.levels = Winston.config.syslog.levels;
        } else if (Config.log.levels === "npm") {
            options.levels = Winston.config.npm.levels;
        }
        return options;
    }

    private static setLogFormat(options: Winston.LoggerOptions, type: LogType): Winston.LoggerOptions {
        options.format = combine(label({ label: type }), timestamp(), prettyPrint({ colorize: true }));

        return options;
    }

    private static setLogTransports(options: Winston.LoggerOptions, type: LogType): Winston.LoggerOptions {
        // Different format for files as colorize adds unicode characters
        const fileFormat = combine(label({ label: type }), timestamp(), prettyPrint({ colorize: false }));

        options.transports = [
            new Winston.transports.Console({
                handleExceptions: true,
                format: combine(
                    colorize(),
                    label({ label: type }),
                    timestamp(),
                    printf((info) => {
                        return `${info.timestamp} :: ${info.label}/${info.level} :: ${info.message} ${info.meta ? " :::: " + JSON.stringify(info.meta) : ""}`;
                    })
                ),
            }),
        ];

        if (Config.log.logfile) {
            options.transports.push(
                new Winston.transports.DailyRotateFile({
                    filename: Config.log.logfile,
                    datePattern: "YYYY-MM-DD-HH",
                    zippedArchive: true,
                    maxFiles: "14d",
                    maxSize: "10m",
                    level: Config.log.level,
                    format: fileFormat,
                })
            );
        }

        return options;
    }
}

export default Logger;
export { LogType, LogLevel };
