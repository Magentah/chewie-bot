import * as express from "express";
import { BotContainer } from "../inversify.config";
import { SongController } from "../controllers";
import { SongService } from "../services";

const songRouter: express.Router = express.Router();
const songController: SongController = new SongController(BotContainer.get(SongService));

songRouter.get("/api/songs", songController.getSongRequests);
songRouter.route("/api/songs/:username").get(songController.getSongsForUser).post(songController.addSongForUser);

export default songRouter;
