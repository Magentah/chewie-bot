import * as express from "express";
import { UserLevels } from "../models";
import { DonationlistController } from "../controllers";
import DonationsRepository from "../database/donations";
import { BotContainer } from "../inversify.config";
import { APIHelper } from "../helpers";

const donationListRouter: express.Router = express.Router();
const donationlistController: DonationlistController = BotContainer.get(DonationlistController);

donationListRouter.get("/api/donationlist", (res, req) => donationlistController.getDonationlist(res, req));

export default donationListRouter;
