import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { ICommandInfo, UserLevels } from "../models";
import { APIHelper } from "../helpers";
import { Logger, LogType } from "../logger";
import { CommandAliasesRepository, TextCommandsRepository } from "../database";
import { CommandType } from "../models/commandInfo";
import { Command } from "../commands/command";

@injectable()
class CommandlistController {
    constructor(
        @inject(TextCommandsRepository) private textCommandsRepository: TextCommandsRepository,
        @inject(CommandAliasesRepository) private commandAliasRepository: CommandAliasesRepository,
        @inject("Commands") private commandList: Map<string, Command>
    ) {
        Logger.info(LogType.ServerInfo, `CommandlistController constructor. TextCommandsRepository exists: ${this.textCommandsRepository !== undefined}`);
    }

    /**
     * Get the full command list, including aliases and system commands.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async getCommandlist(req: Request, res: Response): Promise<void> {
        const resultList: ICommandInfo[] = [];
        for (const command of await this.textCommandsRepository.getList()) {
            resultList.push({
                id: command.id,
                commandName: command.commandName,
                content: command.message,
                type: CommandType.Text,
                minUserLevel: UserLevels.Viewer,
            });
        }

        for (const alias of await this.commandAliasRepository.getList()) {
            resultList.push({
                id: alias.id,
                commandName: alias.alias,
                content: "!" + alias.commandName + (alias.commandArguments ? " " + alias.commandArguments : ""),
                type: CommandType.Alias,
                minUserLevel: UserLevels.Viewer,
            });
        }

        for (const name of this.commandList.keys()) {
            resultList.push({
                commandName: name,
                content: "",
                type: CommandType.System,
                minUserLevel: this.commandList.get(name)?.getMinimumUserLevel(),
            });
        }

        res.status(StatusCodes.OK);
        res.send(resultList);
    }

    /**
     * Updates a command.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async updateCommand(req: Request, res: Response): Promise<void> {
        const commandInfo = req.body as ICommandInfo;
        if (!commandInfo || !commandInfo.id) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a command object."));
            return;
        }

        try {
            switch (commandInfo.type) {
                case CommandType.Alias:
                    const aliasCommand = await this.commandAliasRepository.getById(commandInfo.id);
                    if (aliasCommand) {
                        let commandContent = commandInfo.content;
                        if (commandContent.startsWith("!")) {
                            commandContent = commandContent.substr(1);
                        }

                        // Split list of command arguments to array if any
                        const argsSeparator = commandContent.indexOf(" ");
                        if (argsSeparator > 0) {
                            aliasCommand.commandName = commandContent.substr(0, argsSeparator);
                            aliasCommand.commandArguments = commandContent.substr(argsSeparator + 1).split(" ");
                        } else {
                            aliasCommand.commandName = commandContent;
                            aliasCommand.commandArguments = [];
                        }

                        aliasCommand.alias = commandInfo.commandName;

                        await this.commandAliasRepository.update(aliasCommand);
                    }

                    res.status(StatusCodes.OK);
                    res.send(commandInfo);
                    break;

                case CommandType.Text:
                    const txtCommand = await this.textCommandsRepository.getById(commandInfo.id);
                    if (txtCommand) {
                        txtCommand.commandName = commandInfo.commandName;
                        txtCommand.message = commandInfo.content;
                        await this.textCommandsRepository.update(txtCommand);
                    }

                    res.status(StatusCodes.OK);
                    res.send(commandInfo);
                    break;

                case CommandType.System:
                    Logger.err(LogType.Command, "System commands cannot be edited.");
                    return;
            }
        } catch (err) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR);
            res.send(APIHelper.error(StatusCodes.INTERNAL_SERVER_ERROR, "There was an error when attempting to update the command."));
        }
    }

    /**
     * Remove a command.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async removeCommand(req: Request, res: Response): Promise<void> {
        const commandInfo = req.body as ICommandInfo;
        if (!commandInfo || !commandInfo.id) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a command object."));
            return;
        }

        try {
            switch (commandInfo.type) {
                case CommandType.Alias:
                    await this.commandAliasRepository.delete(commandInfo.commandName);
                    break;

                case CommandType.Text:
                    await this.textCommandsRepository.delete(commandInfo.commandName);
                    break;

                case CommandType.System:
                    throw new RangeError("System commands cannot be deleted.");
            }

            res.sendStatus(StatusCodes.OK);
        } catch (err) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR);
            res.send(APIHelper.error(StatusCodes.INTERNAL_SERVER_ERROR, "There was an error when attempting to delete the command."));
        }
    }
}

export default CommandlistController;
