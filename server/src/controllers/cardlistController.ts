import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { IUser, IUserCard } from "../models";
import { APIHelper } from "../helpers";
import { Logger, LogType } from "../logger";
import CardsRepository from "../database/cardsRepository";
import fs = require("fs");
import path = require("path");
import { Guid } from "guid-typescript";
import CardService from "../services/cardService";
import { IUserCardOnStackInfo } from "../models/userCard";
import { Lang } from "../lang";
import { TwitchService } from "../services/twitchService";
import * as Config from "../config.json";

@injectable()
class CardlistController {
    readonly ImageDir: string = "images";

    constructor(@inject(CardsRepository) private cardRepository: CardsRepository,
                @inject(CardService) private cardService: CardService,
                @inject(TwitchService) private twitchService: TwitchService) {
        Logger.info(
            LogType.ServerInfo,
            `CardlistController constructor. CardsRepository exists: ${this.cardRepository !== undefined}`
        );
    }

    /**
     * Get the full list of user cards.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async getCardlist(req: Request, res: Response): Promise<void> {
        const cards = (await this.cardRepository.getList()).map(x => this.addUrl(x));
        res.status(StatusCodes.OK);
        res.send(cards);
    }

    /**
     * Gets the user's personal card stack.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async getCardStack(req: Request, res: Response): Promise<void> {
        const user = req.user as IUser;
        if (!user) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "User not logged in."));
            return;
        }

        const totalCardCount = await this.cardRepository.getCount();
        const cards = (await this.cardRepository.getCardStack(user)).map(x => this.addCardOnStackUrl(x));
        res.status(StatusCodes.OK);
        res.send({ count: totalCardCount, cards });
    }

    /**
     * Redeem a new random card for the user.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async redeemCard(req: Request, res: Response): Promise<void> {
        const user = req.user as IUser;
        if (!user) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "User not logged in."));
            return;
        }

        const result = await this.cardService.redeemRandomCard(user.username);

        // Post upgrades in chat when redeemed from UI
        if (result && typeof(result) !== "string" && result.isUpgrade) {
            await this.twitchService.sendMessage(Config.twitch.broadcasterName, Lang.get("cards.cardredeemed", user.username, result.name));
        }

        res.status(StatusCodes.OK);
        res.send(result);
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

        const cardData = await this.cardRepository.get(card);
        if (!cardData) {
            return;
        }

        try {
            await this.cardRepository.addOrUpdate({...cardData,
                name: card.name,
                setName: card.setName,
                baseCardName: card.baseCardName,
                rarity: card.rarity,
                isUpgrade: card.isUpgrade
            });
            res.status(StatusCodes.OK);
            res.send(card);
        } catch (err: any) {
            Logger.err(LogType.Cards, err);
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

        const fileExt = this.cardRepository.getFileExt(req.files.image.mimetype);
        if (!fileExt) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Invalid mime type."));
            return;
        }

        try {
            let cardData = await this.cardRepository.get(card);
            if (!cardData) {
                cardData = await this.cardRepository.addOrUpdate({
                    name: card.name,
                    setName: card.setName,
                    baseCardName: card.baseCardName,
                    rarity: card.rarity,
                    creationDate: new Date(),
                    imageId: Guid.create().toString(),
                    isUpgrade: card.isUpgrade
                });
            }

            if (req.files?.image) {
                const newCard = {...cardData, mimetype: req.files.image.mimetype};
                await this.cardRepository.addOrUpdate(newCard);

                if (!fs.existsSync(this.ImageDir)) {
                    fs.mkdirSync(this.ImageDir);
                }

                // Delete old file
                if (cardData.mimetype) {
                    const oldFileExt = this.cardRepository.getFileExt(cardData.mimetype);
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
        } catch (err: any) {
            Logger.err(LogType.Cards, err);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR);
            res.send(
                APIHelper.error(
                    StatusCodes.INTERNAL_SERVER_ERROR, err.message
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
            const result = await this.cardRepository.addOrUpdate({
                name: newCard.name,
                setName: newCard.setName,
                baseCardName: newCard.baseCardName,
                rarity: newCard.rarity,
                creationDate: new Date(),
                imageId: Guid.create().toString(),
                isUpgrade: newCard.isUpgrade
            });
            res.status(StatusCodes.OK);
            res.send(result);
        } catch (err: any) {
            Logger.err(LogType.Cards, err);
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
            this.cardRepository.delete(card);
            if (card.mimetype) {
                const fileExt = this.cardRepository.getFileExt(card.mimetype);
                const imagePath = path.join(this.ImageDir, `${card.imageId}.${fileExt}`);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
        } else if (Number(req.body)) {
            const cardData = await this.cardRepository.get(card);
            if (cardData) {
                this.cardRepository.delete(cardData);
                if (cardData.mimetype) {
                    const fileExt = this.cardRepository.getFileExt(cardData.mimetype);
                    const imagePath = path.join(this.ImageDir, `${cardData.imageId}.${fileExt}`);
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
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
        return {...x, url: `/img/${x.imageId}.${this.cardRepository.getFileExt(x.mimetype ?? "")}` };
    }

    private addCardOnStackUrl(x: IUserCardOnStackInfo): any {
        return {
            ...x, 
            url: x.upgradedImagId ? 
                `/img/${x.upgradedImagId}.${this.cardRepository.getFileExt(x.upgradedMimeType ?? "")}` :
                `/img/${x.imageId}.${this.cardRepository.getFileExt(x.mimetype ?? "")}`
        };
    }
}

export default CardlistController;
