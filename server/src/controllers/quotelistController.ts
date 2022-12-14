import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { IQuote } from "../models";
import { APIHelper } from "../helpers";
import { Logger, LogType } from "../logger";
import QuoteRepository from "../database/quotesRepository";

@injectable()
class QuotelistController {
    constructor(@inject(QuoteRepository) private quotesRepository: QuoteRepository) {
        Logger.info(
            LogType.ServerInfo,
            `QuotelistController constructor. QuoteRepository exists: ${this.quotesRepository !== undefined}`
        );
    }

    /**
     * Get the full list of quotes.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async getQuotelist(req: Request, res: Response): Promise<void> {
        const quotes = await this.quotesRepository.getList();
        res.status(StatusCodes.OK);
        res.send(quotes);
    }

    /**
     * Updates the details of a quote.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async updateQuote(req: Request, res: Response): Promise<void> {
        const quote = req.body as IQuote;
        if (!quote) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a quote object."));
            return;
        }

        try {
            await this.quotesRepository.addOrUpdate({ id: quote.id, author: quote.author, dateAdded: quote.dateAdded, text: quote.text, addedByUserName: quote.addedByUserName });
            res.status(StatusCodes.OK);
            res.send(quote);
        } catch (err) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR);
            res.send(
                APIHelper.error(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    "There was an error when attempting to update the quote."
                )
            );
        }
    }

    /**
     * Adds a quote.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async addQuote(req: Request, res: Response): Promise<void> {
        const newQuote = req.body as IQuote;
        if (!newQuote) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a quote object."));
            return;
        }

        try {
            const result = await this.quotesRepository.addOrUpdate(newQuote);
            res.status(StatusCodes.OK);
            res.send(result);
        } catch (err) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR);
            res.send(
                APIHelper.error(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    "There was an error when attempting to add the quote."
                )
            );
        }
    }

    /**
     * Remove a quote from the quote list by ID.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public removeQuote(req: Request, res: Response): void {
        const quote = req.body as IQuote;
        if (quote?.id) {
            this.quotesRepository.delete(quote.id);
        } else if (Number(req.body)) {
            this.quotesRepository.delete(req.body);
        } else {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a quote object."));
            return;
        }

        res.sendStatus(StatusCodes.OK);
    }
}

export default QuotelistController;
