import { inject, injectable } from "inversify";
import { UserService } from "./userService";
import * as fs from "fs";
import axios, { AxiosRequestConfig } from "axios";
import { Logger, LogType } from "../logger";
import Constants from "../constants";
import { StatusCodes } from "http-status-codes";

@injectable()
export class DropboxService {
    constructor(@inject(UserService) private users: UserService) {
        //Empty
    }

    public async uploadFile(path: string, name: string): Promise<void> {
        try {
            const file = fs.readFileSync(`${path}/${name}`);
            if (file && file.length > 0) {
                const user = await this.users.getBroadcaster();
                if (user && user.dropboxAccessToken) {
                    const dropboxApiArgs = {
                        "path": `/backups/${name}`,
                        "mode": "add",
                    };
                    const options: AxiosRequestConfig = {
                        headers: {
                            "Authorization": `Bearer ${user.dropboxAccessToken}`,
                            "Content-Type": "application/octet-stream",
                            "Dropbox-API-Arg": JSON.stringify(dropboxApiArgs),
                        },
                        maxBodyLength: 150000000    // 150Mb limit.
                    };

                    let data: WritableStream;
                    const response = await axios.post(Constants.DropboxUploadEndpoint, file, options);
                    if (response.status === StatusCodes.OK) {
                        Logger.info(LogType.Backup, `File ${name} successfully uploaded to Dropbox path ${path}`);
                    } else {
                        Logger.err(LogType.Backup, `Error uploading ${name} to Dropbox path ${path}`, response);
                    }
                } else {
                    Logger.err(LogType.Backup, "Dropbox is not configured for the broadcaster.");
                }
            }
        } catch (ex) {
            Logger.err(LogType.Backup, "File upload to Dropbox failed", ex.message);
        }
    }
}

export default DropboxService;
