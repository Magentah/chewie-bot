import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { Logger, LogType } from "../logger";
import SeasonsRepository from "../database/seasonsRepository";
import { APIHelper } from "../helpers";
import BotSettingsService from "../services/botSettingsService";
import { UserService } from "../services/userService";
import { UsersRepository } from "../database/usersRepository";
import { PointLogType } from "../models/pointLog";
import PointLogsRepository from "../database/pointLogsRepository";
import UserTaxStreakRepository from "../database/userTaxStreakRepository";
import AchievementService from "../services/achievementService";

@injectable()
class SeasonController {
    constructor(
        @inject(SeasonsRepository) private seasonsRepository: SeasonsRepository,
        @inject(PointLogsRepository) private pointLogsRepository: PointLogsRepository,
        @inject(UserTaxStreakRepository) private userTaxStreakRepository: UserTaxStreakRepository,
        @inject(UserService) private userService: UserService,
        @inject(UsersRepository) private userRepository: UsersRepository,
        @inject(BotSettingsService) private settingsService: BotSettingsService,
        @inject(AchievementService) private achievementService: AchievementService
    ) {
        Logger.info(LogType.ServerInfo, `SeasonController constructor. SeasonsRepository exists: ${this.seasonsRepository !== undefined}`);
    }

    /**
     * Gets a list of all settings in the database.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async getSeasons(req: Request, res: Response): Promise<void> {
        try {
            const storedSettings = await this.seasonsRepository.getAll();

            res.status(StatusCodes.OK);
            res.send(storedSettings);
        } catch (err: any) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, err.message));
        }
    }

    /**
     * Starts a new season and performs the related operations (resetting points etc.)
     * @param req
     * @param res
     */
    public async addSeason(req: Request, res: Response): Promise<void> {
        try {
            const currentSeason = await this.seasonsRepository.getCurrentSeason();

            // Add new season
            const seasonData = await this.seasonsRepository.addSeason();

            // Reset and archive all users' points.
            for (const user of await this.userRepository.getUsersWithPoints()) {
                if (seasonData.lastSeasonId) {
                    await this.pointLogsRepository.archivePoints(user, seasonData.lastSeasonId);
                }

                await this.userService.changeUserPoints(user, -user.points, PointLogType.SeasonReset);
            }

            // Grant achievements. Consider all streams started and taxes paid until right now.
            // Dont't use season end date because the pure date will be a few hours in the past and miss the current stream.
            this.achievementService.grantSeasonEndAchievements(currentSeason.startDate, new Date());

            // Reset tax streaks
            this.userTaxStreakRepository.reset();

            res.sendStatus(StatusCodes.OK);
        } catch (err: any) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, err.message));
        }
    }
}

export default SeasonController;
