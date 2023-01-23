import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { IGameMessage } from "../models";
import { APIHelper } from "../helpers";
import { Logger, LogType } from "../logger";
import MessagesRepository from "../database/messagesRepository";

@injectable()
class MessagelistController {
    constructor(@inject(MessagesRepository) private messageService: MessagesRepository) {
        Logger.info(
            LogType.ServerInfo,
            `MessagelistController constructor. MessagesRepository exists: ${this.messageService !== undefined}`
        );
    }

    /**
     * Get the full messages list.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async getMessagelist(req: Request, res: Response): Promise<void> {
        const messages = await this.messageService.getList();
        res.status(StatusCodes.OK);
        res.send(messages);
    }

    /**
     * Updates the details of a message.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async updateMessage(req: Request, res: Response): Promise<void> {
        const message = req.body as IGameMessage;
        if (!message) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a message object."));
            return;
        }

        try {
            await this.messageService.addOrUpdate({ id: message.id, type: message.type, eventType: message.eventType, text: message.text });
            res.status(StatusCodes.OK);
            res.send(message);
        } catch (err) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR);
            res.send(
                APIHelper.error(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    "There was an error when attempting to add the message."
                )
            );
        }
    }

    /**
     * Add a message to the message list.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async addMessage(req: Request, res: Response): Promise<void> {
        const newMessage = req.body as IGameMessage;
        if (!newMessage) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a message object."));
            return;
        }

        try {
            const resultMessage = await this.messageService.addOrUpdate({ type: newMessage.type, eventType: newMessage.eventType, text: newMessage.text });
            res.status(StatusCodes.OK);
            res.send(resultMessage);
        } catch (err) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR);
            res.send(
                APIHelper.error(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    "There was an error when attempting to add the message."
                )
            );
        }
    }

    /**
     * Remove a message from the message list by ID.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async removeMessage(req: Request, res: Response): Promise<void> {
        const message = req.body as IGameMessage;
        if (message) {
            await this.messageService.delete(message);
        } else if (Number(req.body)) {
            await this.messageService.delete(req.body);
        } else {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a message object."));
            return;
        }

        res.sendStatus(StatusCodes.OK);
    }
}

export default MessagelistController;
