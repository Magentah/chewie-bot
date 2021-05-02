import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { IUserCard } from "../models";
import { APIHelper } from "../helpers";
import { Logger, LogType } from "../logger";
import CardsRepository from "../database/cardsRepository";
import fs = require("fs");
import path = require("path");
import { Guid } from "guid-typescript";

@injectable()
class CardlistController {
    readonly ImageDir: string = "images";

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
        const cards = (await this.cardService.getList()).map(x => this.addUrl(x));
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

        const cardData = await this.cardService.get(card);
        if (!cardData) {
            return;
        }

        try {
            await this.cardService.addOrUpdate({...cardData, name: card.name, setName: card.setName, rarity: card.rarity});
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
     * Creates or updates an existing card and adds an image to it.
     * Receives data as multipart formdata.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async uploadImage(req: Request, res: Response): Promise<void> {
        const card = JSON.parse(req.body.card) as IUserCard;
        if (!card) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a card object."));
            return;
        }

        let cardData = await this.cardService.get(card);
        if (!cardData) {
            cardData = await this.cardService.addOrUpdate({ name: card.name, setName: card.setName, rarity: card.rarity, creationDate: new Date(), imageId: Guid.create().toString() });
        }

        const fileExt = this.cardService.getFileExt(req.files.image.mimetype);
        if (!fileExt) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Invalid mime type."));
            return;
        }

        try {
            if (req.files?.image) {
                const newCard = {...cardData, mimetype: req.files.image.mimetype};
                await this.cardService.addOrUpdate(newCard);

                if (!fs.existsSync(this.ImageDir)) {
                    fs.mkdirSync(this.ImageDir);
                }

                // Delete old file
                if (cardData.mimetype) {
                    const oldFileExt = this.cardService.getFileExt(cardData.mimetype);
                    const oldFile = path.join(this.ImageDir, `${cardData.imageId}.${oldFileExt}`);
                    if (fs.existsSync(oldFile)) {
                        fs.unlinkSync(oldFile);
                    }
                }

                const fstream = fs.createWriteStream(path.join(this.ImageDir, `${cardData.imageId}.${fileExt}`));
                fstream.write(req.files.image.data);
                fstream.close();

                res.status(StatusCodes.OK);
                res.send(this.addUrl(newCard));
            } else {
                res.sendStatus(StatusCodes.OK);
            }
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
            const result = await this.cardService.addOrUpdate({ name: newCard.name, setName: newCard.setName, rarity: newCard.rarity, creationDate: new Date(), imageId: Guid.create().toString() });
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
    public async removeCard(req: Request, res: Response): Promise<void> {
        const card = req.body as IUserCard;
        if (card) {
            this.cardService.delete(card);
            if (card.mimetype) {
                const fileExt = this.cardService.getFileExt(card.mimetype);
                fs.unlinkSync(path.join(this.ImageDir, `${card.imageId}.${fileExt}`));
            }
        } else if (Number(req.body)) {
            const cardData = await this.cardService.get(card);
            if (cardData) {
                this.cardService.delete(cardData);
                if (cardData.mimetype) {
                    const fileExt = this.cardService.getFileExt(cardData.mimetype);
                    fs.unlinkSync(path.join(this.ImageDir, `${cardData.imageId}.${fileExt}`));
                }
            }
        } else {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a card object."));
            return;
        }

        res.sendStatus(StatusCodes.OK);
    }

    private addUrl(x: IUserCard): any {
        return {...x, url: `/img/${x.imageId}.${this.cardService.getFileExt(x.mimetype ?? "")}` };
    }
}

export default CardlistController;
