import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { ITextCommand, ICommandAlias } from "../models";
import { APIHelper } from "../helpers";
import { Logger, LogType } from "../logger";
import { CommandAliasesRepository, TextCommandsRepository } from "../database";

@injectable()
class CommandlistController {
    constructor(@inject(TextCommandsRepository) private textCommandsRepository: TextCommandsRepository,
                @inject(CommandAliasesRepository) private commandAliasRepository: CommandAliasesRepository) {
        Logger.info(
            LogType.ServerInfo,
            `CommandlistController constructor. TextCommandsRepository exists: ${this.textCommandsRepository !== undefined}`
        );
    }

    /**
     * Get the full command list, including aliases and system commands.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async getCommandlist(req: Request, res: Response): Promise<void> {
        const commands = await this.textCommandsRepository.getList();
        const aliases = await this.commandAliasRepository.getList();
        for (const alias of aliases) {
            commands.push({ commandName: alias.alias, message: "!" + alias.commandName + (alias.commandArguments ? " " + alias.commandArguments : "") });
        }

        res.status(StatusCodes.OK);
        res.send(commands);
    }

    /**
     * Updates a command.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async updateCommand(req: Request, res: Response): Promise<void> {
    }

    /**
     * Add a new command.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async addCommand(req: Request, res: Response): Promise<void> {
    }

    /**
     * Remove a command.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public removeCommand(req: Request, res: Response): void {
    }
}

export default CommandlistController;
