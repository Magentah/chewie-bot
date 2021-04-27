import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { IUserCard } from "../models";
import { APIHelper } from "../helpers";
import { Logger, LogType } from "../logger";
import CardsRepository from "../database/cardsRepository";

@injectable()
class CardlistController {
    constructor(@inject(CardsRepository) private cardService: CardsRepository) {
        Logger.info(
            LogType.ServerInfo,
            `CardlistController constructor. CardsRepository exists: ${this.cardService !== undefined}`
        );
    }

    /**
     * Get the full list of user cards.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async getCardlist(req: Request, res: Response): Promise<void> {
        const cards = await this.cardService.getList();
        res.status(StatusCodes.OK);
        res.send(cards);
    }

    /**
     * Updates the details of a card.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async updateCard(req: Request, res: Response): Promise<void> {
        const card = req.body as IUserCard;
        if (!card) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a card object."));
            return;
        }

        try {
            await this.cardService.addOrUpdate(card);
            res.status(StatusCodes.OK);
            res.send(card);
        } catch (err) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR);
            res.send(
                APIHelper.error(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    "There was an error when attempting to add the card."
                )
            );
        }
    }

    /**
     * Add a card.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async addCard(req: Request, res: Response): Promise<void> {
        const newCard = req.body as IUserCard;
        if (!newCard) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a card object."));
            return;
        }

        try {
            const result = await this.cardService.addOrUpdate({name: newCard.name, rarity: newCard.rarity, creationDate: new Date()});
            res.status(StatusCodes.OK);
            res.send(result);
        } catch (err) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR);
            res.send(
                APIHelper.error(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    "There was an error when attempting to add the card."
                )
            );
        }
    }

    /**
     * Remove a card by ID.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public removeCard(req: Request, res: Response): void {
        const card = req.body as IUserCard;
        if (card) {
            this.cardService.delete(card);
        } else if (Number(req.body)) {
            this.cardService.delete(req.body);
        } else {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a card object."));
            return;
        }

        res.sendStatus(StatusCodes.OK);
    }
}

export default CardlistController;
