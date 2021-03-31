import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import { IUser } from "../models";
import { APIHelper } from "../helpers";
import { Logger, LogType } from "../logger";
import { UserLevelsRepository, UsersRepository } from "../database";
import { UserService } from "../services/userService";

@injectable()
class UserlistController {
    constructor(@inject(UsersRepository) private userRepository: UsersRepository,
                @inject(UserService) private userService: UserService,
                @inject(UserLevelsRepository) private userLevels: UserLevelsRepository) {
        Logger.info(
            LogType.ServerInfo,
            `UserlistController constructor. UserlistRepository exists: ${this.userRepository !== undefined}`
        );
    }

    /**
     * Get the full user list.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async getUserlist(req: Request, res: Response): Promise<void> {
        const users = await this.userRepository.getList();
        res.status(StatusCodes.OK);
        res.send(users);
    }

    /**
     * Get the list of user levels.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async getUserLevels(req: Request, res: Response): Promise<void> {
        const userLevels = await this.userLevels.getList();
        res.status(StatusCodes.OK);
        res.send(userLevels);
    }

    /**
     * Updates the details of a user.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async updateUser(req: Request, res: Response): Promise<void> {
        const newUser = req.body as IUser;
        if (!newUser) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a user object."));
            return;
        }

        try {
            await this.userRepository.update(newUser);
            res.status(StatusCodes.OK);
            res.send(newUser);
        } catch (err) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR);
            res.send(
                APIHelper.error(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    "There was an error when attempting to add the user."
                )
            );
        }
    }

    /**
     * Add a user to the user list.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async addUser(req: Request, res: Response): Promise<void> {
        const newUser = req.body as IUser;
        if (!newUser) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a user object."));
            return;
        }

        try {
            await this.userRepository.add(newUser);
            res.status(StatusCodes.OK);
            res.send(newUser);
        } catch (err) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR);
            res.send(
                APIHelper.error(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    "There was an error when attempting to add the user."
                )
            );
        }
    }

    /**
     * Adds a number of weeks of VIP gold to a user.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public async addVipGold(req: Request, res: Response): Promise<void> {
        const username = req.params.username;
        if (!username) {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a user object."));
            return;
        }

        const vipGoldWeeks = parseInt(req.body.amount, 10);
        if (vipGoldWeeks === 0) {
            // Nothing to do.
            res.sendStatus(StatusCodes.OK);
            return;
        }

        try {
            // Get data from database. Makes sure all properties are correctly typed and data is current.
            const userData = await this.userService.getUser(username);
            if (userData) {
                await this.userService.addVipGoldMonths(userData, vipGoldWeeks / 4);
            }

            res.status(StatusCodes.OK);
            res.send(userData);
        } catch (err) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR);
            res.send(
                APIHelper.error(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    "There was an error when attempting to update the VIP status."
                )
            );
        }
    }

    /**
     * Remove a user from the userlist by ID.
     * @param req Express HTTP Request
     * @param res Express HTTP Response
     */
    public removeUser(req: Request, res: Response): void {
        const user = req.body as IUser;
        if (user) {
            this.userRepository.delete(user);
        } else if (Number(req.body)) {
            this.userRepository.delete(req.body);
        } else {
            res.status(StatusCodes.BAD_REQUEST);
            res.send(APIHelper.error(StatusCodes.BAD_REQUEST, "Request body does not include a user object."));
            return;
        }

        res.sendStatus(StatusCodes.OK);
    }
}

export default UserlistController;
