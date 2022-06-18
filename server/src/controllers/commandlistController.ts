import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { ICommandAlias, ICommandInfo, ITextCommand, UserLevels } from "../models";
import { APIHelper } from "../helpers";
import { Logger, LogType } from "../logger";
import { CommandAliasesRepository, TextCommandsRepository } from "../database";
import { CommandType } from "../models/commandInfo";
import { Command } from "../commands/command";
import { addClassOptionsToClassMetadata } from "@overnightjs/core";

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
            resultList.push(this.mapTextCommand(command));
        }

        for (const alias of await this.commandAliasRepository.getList()) {
            resultList.push(this.mapAliasCommand(alias));
        }

        for (const name of this.commandList.keys()) {
            resultList.push({
                commandName: name,
                content: this.commandList.get(name)?.getDescription() as string,
                type: CommandType.System,
                minUserLevel: this.commandList.get(name)?.getMinimumUserLevel(),
                useCooldown: false
            });
        }

        res.status(StatusCodes.OK);
        res.send(resultList);
    }

    /**
     * Adds a command.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
     public async addCommand(req: Request, res: Response): Promise<void> {
        const commandInfo = req.body as ICommandInfo;
        if (!commandInfo) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a command object."));
            return;
        }

        if (!commandInfo.commandName) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Command name cannot be empty."));
            return;
        }

        try {
            switch (commandInfo.type) {
                case CommandType.Alias:
                    let commandContent = commandInfo.content;
                    if (commandContent.startsWith("!")) {
                        commandContent = commandContent.substr(1);
                    }

                    let commandName = "";
                    let commandArguments = "";

                    // Split list of command arguments to array if any
                    const argsSeparator = commandContent.indexOf(" ");
                    if (argsSeparator > 0) {
                        commandName = commandContent.substr(0, argsSeparator);
                        commandArguments = commandContent.substr(argsSeparator + 1);
                    } else {
                        commandName = commandContent;
                    }

                    const alias = commandInfo.commandName;

                    await this.commandAliasRepository.add({ alias, commandName, commandArguments });
                    const resultAlias = await this.commandAliasRepository.get(alias);

                    res.status(StatusCodes.OK);
                    res.send(this.mapAliasCommand(resultAlias));
                    break;

                case CommandType.Text:
                    await this.textCommandsRepository.add({
                        commandName: commandInfo.commandName,
                        message: commandInfo.content ?? "",
                        useCount: commandInfo.useCount ?? 0,
                        useCooldown: commandInfo.useCooldown ?? true,
                        minimumUserLevel: commandInfo.minUserLevel ? commandInfo.minUserLevel : UserLevels.Viewer
                    });

                    const resultTextCmd = await this.textCommandsRepository.get(commandInfo.commandName);
                    res.status(StatusCodes.OK);
                    res.send(this.mapTextCommand(resultTextCmd));
                    break;

                case CommandType.System:
                    res.sendStatus(StatusCodes.NOT_IMPLEMENTED);
                    return;
            }
        } catch (err: any) {
            if (err.code === "SQLITE_CONSTRAINT") {
                res.status(StatusCodes.BAD_REQUEST);
                res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Command with same name already exists."));
            } else {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR);
                res.send(APIHelper.error(StatusCodes.INTERNAL_SERVER_ERROR, "There was an error when attempting to add the command."));
            }
        }
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
                            aliasCommand.commandArguments = commandContent.substr(argsSeparator + 1);
                        } else {
                            aliasCommand.commandName = commandContent;
                            aliasCommand.commandArguments = "";
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
                        txtCommand.useCount = commandInfo.useCount ?? 0;
                        txtCommand.useCooldown = commandInfo.useCooldown ?? true;
                        txtCommand.minimumUserLevel = commandInfo.minUserLevel;
                        await this.textCommandsRepository.update(txtCommand);
                    }

                    res.status(StatusCodes.OK);
                    res.send(commandInfo);
                    break;

                case CommandType.System:
                    res.sendStatus(StatusCodes.NOT_IMPLEMENTED);
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

    private mapAliasCommand(alias: ICommandAlias): ICommandInfo {
        return {
            id: alias.id,
            commandName: alias.alias,
            content: "!" + alias.commandName + (alias.commandArguments ? " " + alias.commandArguments : ""),
            type: CommandType.Alias,
            minUserLevel: UserLevels.Viewer,
            useCooldown: false
        };
    }

    private mapTextCommand(command: ITextCommand): ICommandInfo {
        return {
            id: command.id,
            commandName: command.commandName,
            content: command.message,
            type: CommandType.Text,
            minUserLevel: command.minimumUserLevel ?? UserLevels.Viewer,
            useCount: command.useCount,
            useCooldown: command.useCooldown
        };
    }
}

export default CommandlistController;
