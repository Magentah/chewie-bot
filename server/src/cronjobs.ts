import * as cron from "node-cron";
import { exec } from "child_process";
import { Logger, LogType } from "./logger";
import * as Config from "./config.json";
import * as moment from "moment";
import { BotContainer } from "./inversify.config";
import DropboxService from "./services/dropboxService";

const dropboxService = BotContainer.get(DropboxService);
let filename: string;

export function createDatabaseBackupJob(): void {
    Logger.info(LogType.Backup, `Created Backup Database Job with cron frequency ${Config.database.backupCronFrequency}`);
    cron.schedule(Config.database.backupCronFrequency, databaseBackup);
}

function databaseBackup(): void {
    Logger.info(LogType.Backup, "Backing up database.");
    if (Config.database.client === "sqlite3") {
        const now = moment();
        filename = `${now.format("YYYY-MM-DD-HH-mm-ss")}.chewiedb.backup`;
        exec("mkdir db/backups");
        exec(`sqlite3 ${Config.database.connection.name} .dump > 'db/backups/${filename}'`, handleExec);
    }
}

async function handleExec(error: any, stderr: any, stdout: any): Promise<void> {
    if (error) {
        Logger.err(LogType.Backup, "There was an error running the command to back up the database.", error);
        return;
    }
    if (stderr) {
        Logger.err(LogType.Backup, "There was an error backing up the database.", stderr);
        return;
    }

    Logger.info(LogType.Backup, "Backup command executed", stdout);
    Logger.info(LogType.Backup, "Attempting to upload backup file to Dropbox.");

    await dropboxService.UploadFile("db/backups", filename);
}
