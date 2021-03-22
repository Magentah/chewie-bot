import * as cron from "node-cron";
import { exec } from "child_process";
import { Logger, LogType } from "./logger";
import * as Config from "./config.json";
import * as moment from "moment";

export function createDatabaseBackupJob(): void {
    Logger.info(LogType.Backup, "Created Backup Database Job");
    cron.schedule(Config.database.backupCronFrequency, databaseBackup);
}

function databaseBackup(): void {
    Logger.info(LogType.Backup, "Backing up database.");
    if (Config.database.client === "sqlite3") {
        const now = moment();
        exec(`sqlite3 ${Config.database.connection.name} ".backup '/db/backups/${now.format("YYYY-MM-DD-HH-mm-ss")}.chewiedb.backup'"`, handleExec);
    }
}

function handleExec(error: any, stderr: any, stdout: any): void {
    if (error) {
        Logger.err(LogType.Backup, "There was an error running the command to back up the database.", error);
        return;
    }
    if (stderr) {
        Logger.err(LogType.Backup, "There was an error backing up the database.", stderr);
        return;
    }

    Logger.info(LogType.Backup, "Backup command executed", stdout);
}
