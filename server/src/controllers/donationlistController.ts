import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { Logger, LogType } from "../logger";
import { DonationsRepository } from "../database";

@injectable()
class DonationlistController {
    constructor(@inject(DonationsRepository) private donationlistService: DonationsRepository) {
        Logger.info(
            LogType.ServerInfo,
            `DonationlistController constructor. DonationsRepository exists: ${this.donationlistService !== undefined}`
        );
    }

    /**
     * Get the full donation list.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async getDonationlist(req: Request, res: Response): Promise<void> {
        const donationlist = (await this.donationlistService.getAll()).map(x =>
            ({ username: x.username, amount: x.amount, message: x.message, date: new Date(x.date).toDateString() })
        );
        res.status(StatusCodes.OK);
        res.send(donationlist);
    }
}

export default DonationlistController;
